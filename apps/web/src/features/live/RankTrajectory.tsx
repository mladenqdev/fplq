import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRank, formatRankCompact, type RankSampleDto } from '@fplq/shared';

interface Props {
  samples: RankSampleDto[];
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

export default function RankTrajectory({ samples }: Props) {
  const points = useMemo(
    () =>
      samples.map((s) => ({
        t: new Date(s.t).getTime(),
        label: new Date(s.t).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rank: s.overallRank,
      })),
    [samples]
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-fg">Rank trajectory</h2>
      {points.length < 2 ? (
        <div className="flex h-32 items-center justify-center text-center text-xs text-faint">
          {points.length === 0
            ? 'No samples yet — the tracker records your rank as matches play out.'
            : 'Collecting samples…'}
        </div>
      ) : (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
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
                type="monotone"
                dataKey="rank"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
