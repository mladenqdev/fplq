import {
  formatPrice,
  type ChipName,
  type DerivedGameweek,
  type PlannerContext,
} from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import { chipLabel } from '../../lib/labels';
import { formatShortDate } from '../../lib/time';

const CHIP_OPTIONS: ChipName[] = ['wildcard', 'freehit', 'bboost', '3xc'];

interface Props {
  gameweeks: DerivedGameweek[];
  index: BootstrapIndex;
  ctx: PlannerContext;
  onSetChip: (event: number, chip: ChipName | null) => void;
  onRemoveTransfer: (event: number, transferIndex: number) => void;
}

export default function GwColumns({ gameweeks, index, ctx, onSetChip, onRemoveTransfer }: Props) {
  return (
    <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
      {gameweeks.map((gw) => {
        const event = index.eventById.get(gw.event);
        return (
          <div
            key={gw.event}
            className="w-44 shrink-0 rounded-xl border border-line bg-surface p-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold">GW{gw.event}</span>
              <span className="text-[10px] text-faint">
                {event ? formatShortDate(event.deadlineTime) : ''}
              </span>
            </div>

            <div className="num mt-2 grid grid-cols-2 gap-1 text-[11px]">
              <span className="text-faint">FT</span>
              <span className="text-right font-semibold">{gw.freeTransfers}</span>
              <span className="text-faint">Moves</span>
              <span className="text-right font-semibold">{gw.transfersMade}</span>
              <span className="text-faint">Hit</span>
              <span className={`text-right font-semibold ${gw.hitCost > 0 ? 'text-down' : ''}`}>
                {gw.hitCost > 0 ? `−${gw.hitCost}` : '0'}
              </span>
              <span className="text-faint">Bank</span>
              <span className={`text-right font-semibold ${gw.bank < 0 ? 'text-down' : ''}`}>
                £{formatPrice(gw.bank)}
              </span>
            </div>

            <select
              value={gw.chip ?? ''}
              onChange={(e) => onSetChip(gw.event, (e.target.value || null) as ChipName | null)}
              className="mt-2 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-xs outline-none"
            >
              <option value="">No chip</option>
              {CHIP_OPTIONS.map((chip) => {
                const available = ctx.isChipAvailable(chip, gw.event);
                if (!available && gw.chip !== chip) return null;
                return (
                  <option key={chip} value={chip}>
                    {chipLabel(chip)}
                  </option>
                );
              })}
            </select>

            {gw.transfers.length > 0 && (
              <ul className="mt-2 space-y-1">
                {gw.transfers.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-1 rounded-lg bg-surface2 px-2 py-1 text-[11px]"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-down">
                        {index.elementById.get(t.out)?.webName ?? t.out}
                      </span>
                      {' → '}
                      <span className="text-up">
                        {index.elementById.get(t.in)?.webName ?? t.in}
                      </span>
                    </span>
                    <button
                      onClick={() => onRemoveTransfer(gw.event, i)}
                      className="shrink-0 text-faint active:text-down"
                      aria-label="Remove transfer"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {gw.problems.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {gw.problems.map((p, i) => (
                  <li key={i} className="text-[10px] leading-tight text-down">
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
