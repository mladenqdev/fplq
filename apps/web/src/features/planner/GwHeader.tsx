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
  gw: DerivedGameweek;
  total: number;
  index: BootstrapIndex;
  ctx: PlannerContext;
  onSetChip: (event: number, chip: ChipName | null) => void;
  onRemoveTransfer: (event: number, transferIndex: number) => void;
}

export default function GwHeader({ gw, total, index, ctx, onSetChip, onRemoveTransfer }: Props) {
  const event = index.eventById.get(gw.event);

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">GW{gw.event}</span>
            <span className="text-[11px] text-faint">
              {event ? formatShortDate(event.deadlineTime) : ''}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="num text-2xl font-black text-accent">{total.toFixed(1)}</span>
            <span className="text-xs text-muted">proj pts</span>
            <span className="ml-1 rounded bg-surface2 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-faint">
              est.
            </span>
          </div>
        </div>

        <select
          value={gw.chip ?? ''}
          onChange={(e) => onSetChip(gw.event, (e.target.value || null) as ChipName | null)}
          className="shrink-0 rounded-lg border border-line bg-bg px-2 py-1.5 text-xs outline-none"
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
      </div>

      <div className="num grid grid-cols-4 gap-2 text-center text-xs">
        <Stat label="Bank" value={`£${formatPrice(gw.bank)}`} bad={gw.bank < 0} />
        <Stat label="FT" value={String(gw.freeTransfers)} />
        <Stat label="Moves" value={String(gw.transfersMade)} />
        <Stat label="Hit" value={gw.hitCost > 0 ? `−${gw.hitCost}` : '0'} bad={gw.hitCost > 0} />
      </div>

      {gw.transfers.length > 0 && (
        <ul className="space-y-1">
          {gw.transfers.map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-1 rounded-lg bg-surface2 px-2 py-1 text-[11px]"
            >
              <span className="min-w-0 truncate">
                <span className="text-down">{index.elementById.get(t.out)?.webName ?? t.out}</span>
                {' → '}
                <span className="text-up">{index.elementById.get(t.in)?.webName ?? t.in}</span>
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
        <ul className="space-y-0.5">
          {gw.problems.map((p, i) => (
            <li key={i} className="text-[11px] leading-tight text-down">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg bg-surface2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-faint">{label}</div>
      <div className={`font-bold ${bad ? 'text-down' : 'text-fg'}`}>{value}</div>
    </div>
  );
}
