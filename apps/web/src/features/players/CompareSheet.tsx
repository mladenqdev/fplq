import { formatPrice, type ElementDto } from '@fplq/shared';
import BottomSheet from '../../components/BottomSheet';
import PlayerPhoto from '../../components/PlayerPhoto';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import { COMPARE_GROUPS, bestValue, displayValue, type CompareStat } from './compare';

interface Props {
  players: ElementDto[];
  index: BootstrapIndex;
  onRemove: (id: number) => void;
  onClear: () => void;
  onClose: () => void;
}

function statusColor(status: string): string | null {
  if (status === 'a') return null;
  if (status === 'd') return 'bg-warn';
  return 'bg-down';
}

function StatRow({
  stat,
  players,
  cols,
}: {
  stat: CompareStat;
  players: ElementDto[];
  cols: React.CSSProperties;
}) {
  const best = bestValue(stat, players);
  return (
    <div className="grid items-center gap-1 px-2 py-2" style={cols}>
      <div className="text-[11px] leading-tight text-muted">
        {stat.label}
        {stat.direction === 'lower' && <span className="text-faint"> ↓</span>}
      </div>
      {players.map((p) => {
        const v = stat.value(p);
        const missing = v == null;
        const winner = best != null && v === best;
        return (
          <div key={p.id} className="text-center">
            <span
              className={`num inline-block rounded px-1.5 py-0.5 text-sm ${
                missing ? 'text-faint' : winner ? 'bg-accent/15 font-bold text-accent' : 'text-fg'
              }`}
            >
              {displayValue(stat, p)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CompareSheet({ players, index, onRemove, onClear, onClose }: Props) {
  const cols: React.CSSProperties = {
    gridTemplateColumns: `5.25rem repeat(${players.length}, minmax(0, 1fr))`,
  };
  const mixedPositions = new Set(players.map((p) => p.elementType)).size > 1;

  return (
    <BottomSheet open={players.length >= 2} onClose={onClose} title="Head to head">
      <div className="space-y-4">
        <div className="grid items-start gap-1" style={cols}>
          <div />
          {players.map((p) => {
            const dot = statusColor(p.status);
            return (
              <div
                key={p.id}
                className="relative rounded-xl bg-surface2 px-1.5 pb-2 pt-2 text-center"
              >
                <button
                  onClick={() => onRemove(p.id)}
                  aria-label={`Remove ${p.webName}`}
                  className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-bg/70 text-[11px] text-muted active:opacity-70"
                >
                  ✕
                </button>
                <PlayerPhoto
                  code={p.code}
                  name={p.webName}
                  className="mx-auto h-14 w-11 rounded-lg"
                />
                <div className="mt-1 flex items-center justify-center gap-1">
                  <span className="truncate text-xs font-semibold text-fg">{p.webName}</span>
                  {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />}
                </div>
                <div className="text-[10px] text-faint">
                  {index.teamShort(p.team)} · {index.typeShort(p.elementType)}
                </div>
                <div className="num text-[11px] font-semibold text-fg">
                  £{formatPrice(p.nowCost)}
                </div>
              </div>
            );
          })}
        </div>

        {players.some((p) => p.status !== 'a' && p.news) && (
          <div className="space-y-1">
            {players
              .filter((p) => p.status !== 'a' && p.news)
              .map((p) => (
                <div key={p.id} className="rounded-lg bg-warn/15 px-3 py-1.5 text-[11px] text-warn">
                  <span className="font-semibold">{p.webName}:</span> {p.news}
                </div>
              ))}
          </div>
        )}

        <p className="text-[11px] text-faint">
          Best value highlighted. ↓ marks stats where lower is better.
          {mixedPositions && ' Comparing across positions.'}
        </p>

        {COMPARE_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
              {group.title}
            </h3>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {group.stats.map((stat) => (
                <StatRow key={stat.key} stat={stat} players={players} cols={cols} />
              ))}
            </div>
          </section>
        ))}

        <button
          onClick={onClear}
          className="w-full rounded-xl bg-surface2 py-2.5 text-sm font-medium text-muted active:opacity-70"
        >
          Clear comparison
        </button>
      </div>
    </BottomSheet>
  );
}
