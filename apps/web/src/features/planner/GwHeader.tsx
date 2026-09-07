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
  const problems = gw.problems.filter((p) => p !== 'Negative bank');
  return (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-3 lg:gap-6">
        <div className="flex-1 lg:flex-none">
          <span className="text-base font-bold">GW{gw.event}</span>
          <span className="ml-2 text-[11px] text-faint">
            {event ? formatShortDate(event.deadlineTime) : ''}
          </span>
        </div>
        <select
          aria-label="Gameweek chip"
          value={gw.chip ?? ''}
          onChange={(e) => onSetChip(gw.event, (e.target.value || null) as ChipName | null)}
          className="rounded-lg border border-line bg-bg px-2 py-2 text-xs lg:order-last lg:ml-auto"
        >
          <option value="">No chip</option>
          {CHIP_OPTIONS.filter(
            (chip) => ctx.isChipAvailable(chip, gw.event) || gw.chip === chip
          ).map((chip) => (
            <option key={chip} value={chip}>
              {chipLabel(chip)}
            </option>
          ))}
        </select>
        <div className="num grid w-full grid-cols-5 gap-2 text-center lg:w-auto lg:min-w-[28rem] lg:flex-1">
          <Stat label="Est. points" value={total.toFixed(1)} accent />
          <Stat
            label={gw.bank < 0 ? 'Over budget' : 'Bank'}
            value={`${gw.bank < 0 ? '−' : ''}£${formatPrice(Math.abs(gw.bank))}`}
            bad={gw.bank < 0}
          />
          <Stat label="Free moves" value={String(gw.freeTransfers)} />
          <Stat label="Transfers" value={String(gw.transfersMade)} />
          <Stat label="Hit" value={gw.hitCost > 0 ? `−${gw.hitCost}` : '0'} bad={gw.hitCost > 0} />
        </div>
      </div>
      {gw.transfers.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer py-1 text-muted">
            {gw.transfers.length} planned {gw.transfers.length === 1 ? 'transfer' : 'transfers'}
          </summary>
          <ul className="mt-1 flex flex-wrap gap-2">
            {gw.transfers.map((t, i) => (
              <li key={i} className="flex items-center gap-2 rounded-lg bg-surface2 px-2 py-1">
                <span>
                  {index.elementById.get(t.out)?.webName ?? t.out} →{' '}
                  {index.elementById.get(t.in)?.webName ?? t.in}
                </span>
                <button
                  onClick={() => onRemoveTransfer(gw.event, i)}
                  className="px-2 py-1 text-down"
                  aria-label={`Revert transfer to ${index.elementById.get(t.in)?.webName ?? t.in}`}
                >
                  ↶ Revert
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {problems.map((problem, i) => (
        <p key={i} className="text-xs text-down">
          {problem}
        </p>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  bad = false,
  accent = false,
}: {
  label: string;
  value: string;
  bad?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide text-faint">{label}</div>
      <div
        className={`text-sm font-bold ${bad ? 'text-down' : accent ? 'text-accent' : 'text-fg'}`}
      >
        {value}
      </div>
    </div>
  );
}
