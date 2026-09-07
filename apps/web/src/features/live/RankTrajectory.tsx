import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRank, formatRankCompact, type RankSampleDto } from '@fplq/shared';
import { timeAgo, useNow } from '../../lib/time';

interface Props {
  samples: RankSampleDto[];
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  checkedAt: number;
  onRefresh: () => void;
}

interface ChartPoint {
  label: string;
  rank: number;
}

interface TooltipInjectedProps {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}

function ChartTooltip({ active, payload }: TooltipInjectedProps) {
  const entry = payload?.[0];
  if (!active || !entry) return null;
  const point = entry.payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="num font-semibold text-fg">{formatRank(point.rank)}</div>
      <div className="text-faint">{point.label}</div>
    </div>
  );
}

export default function RankTrajectory({
  samples,
  loading,
  refreshing,
  error,
  checkedAt,
  onRefresh,
}: Props) {
  const now = useNow();
  const points = useMemo(
    () =>
      samples.map((s) => ({
        t: new Date(s.t).getTime(),
        label: new Date(s.t).toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
        rank: s.overallRank,
      })),
    [samples]
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Rank trajectory</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="px-2 py-1 text-xs text-brand disabled:opacity-50"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-2 text-xs text-down">
          Could not refresh rank history.{' '}
          {points.length > 0 ? 'Showing saved samples.' : 'Try refreshing.'}
        </p>
      )}
      {points.length === 0 ? (
        <div className="flex h-20 items-center justify-center text-center text-xs text-faint">
          {loading
            ? 'Loading rank history…'
            : error
              ? 'Rank history is unavailable.'
              : 'No rank samples saved for this gameweek yet. Refresh to check again.'}
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleString(undefined, {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }
                tick={{ fontSize: 10, fill: 'var(--faint)' }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                reversed
                domain={['dataMin', 'dataMax']}
                tick={{ fontSize: 10, fill: 'var(--faint)' }}
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v: number) => formatRankCompact(v)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="stepAfter"
                dataKey="rank"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={points.length === 1 ? { r: 4 } : false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {samples.length > 0 && (
        <p className="mt-2 text-[10px] text-faint">
          Last recorded change {timeAgo(samples[samples.length - 1]!.t, now)} · {samples.length}{' '}
          samples
        </p>
      )}
      {checkedAt > 0 && (
        <p className="text-[10px] text-faint">
          History checked {timeAgo(new Date(checkedAt).toISOString(), now)}
        </p>
      )}
    </section>
  );
}
