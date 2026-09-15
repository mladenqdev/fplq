import {
  formatPrice,
  type ChipName,
  type DerivedGameweek,
  type PlannerContext,
} from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import SelectChevron from '../../components/SelectChevron';
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
    <section
      className="space-y-3 rounded-2xl border border-line bg-surface p-3"
      aria-label="Transfer summary"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-base font-bold">GW{gw.event} transfer plan</span>
          <span className="ml-2 text-[11px] text-faint">
            {event ? formatShortDate(event.deadlineTime) : ''}
          </span>
        </div>
        <div className="relative shrink-0">
          <select
            aria-label="Gameweek chip"
            value={gw.chip ?? ''}
            onChange={(e) => onSetChip(gw.event, (e.target.value || null) as ChipName | null)}
            className="min-h-10 appearance-none rounded-lg border border-line bg-bg py-2 pl-3 pr-10 text-xs"
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
          <SelectChevron />
        </div>
      </div>
      <div className="num grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
        <Stat label="Free transfers" value={String(gw.freeTransfers)} accent />
        <Stat
          label={gw.bank < 0 ? 'Over budget' : 'Bank'}
          value={`${gw.bank < 0 ? '−' : ''}£${formatPrice(Math.abs(gw.bank))}`}
          bad={gw.bank < 0}
        />
        <Stat label="Planned" value={String(gw.transfersMade)} />
        <Stat label="Hit" value={gw.hitCost > 0 ? `−${gw.hitCost}` : '0'} bad={gw.hitCost > 0} />
        <Stat label="Estimated XI" value={total.toFixed(1)} className="col-span-2 sm:col-span-1" />
      </div>
      <p className="text-[10px] text-faint">
        Free transfers calculated from official FPL transfer and chip history.
      </p>
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
    </section>
  );
}

function Stat({
  label,
  value,
  bad = false,
  accent = false,
  className = '',
}: {
  label: string;
  value: string;
  bad?: boolean;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-surface2 px-2 py-2 ${className}`}>
      <div className="text-[9px] uppercase tracking-wide text-faint">{label}</div>
      <div
        className={`text-sm font-bold ${bad ? 'text-down' : accent ? 'text-accent' : 'text-fg'}`}
      >
        {value}
      </div>
    </div>
  );
}
