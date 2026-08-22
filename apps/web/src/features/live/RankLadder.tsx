import { useMemo } from 'react';
import type { LadderDto } from '@fplq/shared';

interface Props {
  ladder: LadderDto;
  overallPoints: number;
  overallRank: number;
}

function rungLabel(rank: number): string {
  if (rank >= 1_000_000) return `${rank / 1_000_000}M`;
  return `${rank / 1000}k`;
}

export default function RankLadder({ ladder, overallPoints, overallRank }: Props) {
  const rungs = useMemo(() => [...ladder.rungs].sort((a, b) => a.rank - b.rank), [ladder.rungs]);

  // Boundary = between the best rung not yet reached and the first rung reached (rule: fewer
  // points as rank worsens, so `reached` means the user has at least that rung's points).
  const firstReached = rungs.findIndex((r) => overallPoints >= r.total);
  const boundary = new Set<number>();
  const above = firstReached > 0 ? rungs[firstReached - 1] : undefined;
  const at = firstReached >= 0 ? rungs[firstReached] : undefined;
  if (above) boundary.add(above.rank);
  if (at) boundary.add(at.rank);

  if (rungs.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface p-4 text-xs text-faint">
        Ladder unavailable.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Rank ladder</h2>
        <span className="text-[10px] text-faint">points at each rung</span>
      </div>
      <ul className="divide-y divide-line">
        {rungs.map((rung) => {
          const reached = overallPoints >= rung.total;
          const gap = rung.total - overallPoints;
          const isBoundary = boundary.has(rung.rank);
          return (
            <li
              key={rung.rank}
              className={`flex items-center justify-between gap-2 py-2 ${
                isBoundary ? 'rounded-lg bg-brand-soft px-2 -mx-2' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`num w-12 text-sm font-semibold ${reached ? 'text-muted' : 'text-fg'}`}
                >
                  {rungLabel(rung.rank)}
                </span>
                <span className="num text-sm text-muted">{rung.total} pts</span>
              </div>
              <span className={`num text-xs font-medium ${reached ? 'text-up' : 'text-muted'}`}>
                {reached ? "you're above" : `+${gap} to reach`}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="num mt-2 text-[11px] text-faint">
        You: {overallPoints} pts · rank {overallRank.toLocaleString()}
      </p>
    </section>
  );
}
