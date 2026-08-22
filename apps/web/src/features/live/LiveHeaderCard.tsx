import { formatRank } from '@fplq/shared';
import type { EntryLiveDto, EventDto } from '@fplq/shared';
import RankDelta from '../../components/RankDelta';
import { chipLabel } from '../../lib/labels';
import { timeAgo, useNow } from '../../lib/time';

interface Props {
  data: EntryLiveDto;
  event: EventDto | undefined;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <span className="num text-sm font-semibold text-fg">{children}</span>
    </div>
  );
}

export default function LiveHeaderCard({ data, event }: Props) {
  const now = useNow(15_000);
  const chip = chipLabel(data.activeChip);
  const { official, previous } = data;

  return (
    <section className="rounded-2xl border border-line bg-gradient-to-b from-brand-soft to-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted">
              GW{data.event} points
            </span>
            {data.isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-down/15 px-2 py-0.5 text-[10px] font-semibold text-down">
                <span className="pulse-dot size-1.5 rounded-full bg-down" />
                LIVE
              </span>
            )}
            {data.gwFinished && (
              <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                FINAL
              </span>
            )}
          </div>
          <div className="num mt-0.5 text-5xl font-black leading-none text-fg">
            {official.eventPoints}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {chip && (
            <span className="rounded-full bg-brand/20 px-2.5 py-1 text-xs font-semibold text-brand">
              {chip}
            </span>
          )}
          {data.transfersCost > 0 && (
            <span className="num rounded-full bg-down/15 px-2.5 py-1 text-xs font-semibold text-down">
              −{data.transfersCost} hit
            </span>
          )}
          <span className="text-[10px] text-faint">updated {timeAgo(data.fetchedAt, now)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface/60 p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-faint">Overall rank</span>
            <div className="num flex items-baseline gap-2 text-2xl font-bold text-fg">
              {formatRank(official.overallRank)}
              <RankDelta current={official.overallRank} previous={previous.overallRank} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wide text-faint">GW rank</span>
            <div className="num text-lg font-semibold text-fg">
              {official.eventRank != null ? formatRank(official.eventRank) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="GW avg">{event?.averageEntryScore ?? '—'}</Stat>
        <Stat label="GW high">{event?.highestScore ?? '—'}</Stat>
        <Stat label="On bench">{data.pointsOnBench}</Stat>
      </div>
    </section>
  );
}
