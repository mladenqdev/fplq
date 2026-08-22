// Builds SquadDto (the planner starting point) from the latest picks + transfers +
// bootstrap + history, using shared prices and free-transfer rules (3.6, 3.7).

import type { FplElement, SquadDto, SquadPlayerDto, FtInput } from '@fplq/shared';
import {
  initialPurchasePrice,
  purchasePriceOf,
  sellingPrice,
  freeTransfersForEvent,
} from '@fplq/shared';
import type { AppContext } from '../context';
import { currentEventId, nextEventId } from '../mappers/bootstrap';

export async function buildSquad(ctx: AppContext, entryId: number): Promise<SquadDto> {
  const [bootstrap, entry, transfers, history] = await Promise.all([
    ctx.getBootstrap(),
    ctx.getEntry(entryId),
    ctx.getTransfers(entryId),
    ctx.getHistory(entryId),
  ]);

  const baseEvent =
    currentEventId(bootstrap.value) ?? entry.value.current_event ?? entry.value.started_event;
  const nextEvent = nextEventId(bootstrap.value) ?? baseEvent + 1;

  const picks = await ctx.getPicks(entryId, baseEvent);
  const elementsById = new Map<number, FplElement>(bootstrap.value.elements.map((e) => [e.id, e]));

  const players: SquadPlayerDto[] = picks.value.picks.map((p) => {
    const el = elementsById.get(p.element);
    const nowCost = el?.now_cost ?? 0;
    const initial = el ? initialPurchasePrice(el.now_cost, el.cost_change_start) : nowCost;
    const purchasePrice = purchasePriceOf(p.element, transfers.value, initial);
    return {
      element: p.element,
      position: p.position,
      purchasePrice,
      sellingPrice: sellingPrice(purchasePrice, nowCost),
      nowCost,
    };
  });

  const ftInput: FtInput = {
    startedEvent: entry.value.started_event,
    history: history.value.current.map((r) => ({ event: r.event, transfers: r.event_transfers })),
    chipEvents: history.value.chips.map((c) => ({ name: c.name, event: c.event })),
    maxFt: 1 + bootstrap.value.game_settings.max_extra_free_transfers,
  };

  return {
    fetchedAt: picks.fetchedAt,
    entryId,
    baseEvent,
    nextEvent,
    bank: picks.value.entry_history.bank,
    freeTransfers: freeTransfersForEvent(ftInput, nextEvent),
    chipsUsed: history.value.chips.map((c) => ({ name: c.name, event: c.event })),
    players,
    activeChipBase: picks.value.active_chip,
  };
}
