import type { BootstrapDto, SquadDto } from '@fplq/shared';
import type { ChipName, PlannerContext, PlannerFixture } from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { TeamFixtureItem } from '../../lib/team-fixtures';

export function buildPlannerContext(
  squad: SquadDto,
  bootstrap: BootstrapDto,
  index: BootstrapIndex,
  fixtureIndex: Map<string, TeamFixtureItem[]>
): PlannerContext {
  const sellingPrice = new Map(squad.players.map((p) => [p.element, p.sellingPrice]));

  const chipWindow = (chip: ChipName, event: number) =>
    bootstrap.chips.find((c) => c.name === chip && c.startEvent <= event && event <= c.stopEvent);

  return {
    startingSquad: squad.players.map((p) => p.element),
    bank: squad.bank,
    freeTransfersAtStart: squad.freeTransfers,
    maxFreeTransfers: bootstrap.rules.maxFreeTransfers,
    squadTeamLimit: bootstrap.rules.squadTeamLimit,
    sellingPriceOf: (element) =>
      sellingPrice.get(element) ?? index.elementById.get(element)?.nowCost ?? 0,
    nowCostOf: (element) => index.elementById.get(element)?.nowCost ?? 0,
    elementTypeOf: (element) => index.elementById.get(element)?.elementType ?? 0,
    teamOf: (element) => index.elementById.get(element)?.team ?? 0,
    fixturesFor: (team, event): PlannerFixture[] =>
      (fixtureIndex.get(`${team}:${event}`) ?? []).map((f) => ({
        id: f.id,
        opponent: f.opponent,
        isHome: f.isHome,
        difficulty: f.difficulty,
      })),
    isChipAvailable: (chip, event) => {
      const window = chipWindow(chip, event);
      if (!window) return false;
      const usedInWindow = squad.chipsUsed.some(
        (u) => u.name === chip && u.event >= window.startEvent && u.event <= window.stopEvent
      );
      return !usedInWindow;
    },
  };
}
