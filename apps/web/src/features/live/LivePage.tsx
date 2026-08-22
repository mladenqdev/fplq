import { useState } from 'react';
import type { EntryLivePickDto } from '@fplq/shared';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import {
  useBootstrap,
  useEntryLive,
  useHealth,
  useLadder,
  useRankHistory,
} from '../../lib/queries';
import { useEntryId } from '../../stores/useEntryId';
import { ErrorState, LoadingScreen } from '../../components/states';
import LiveHeaderCard from './LiveHeaderCard';
import RankTrajectory from './RankTrajectory';
import RankLadder from './RankLadder';
import PitchView from './PitchView';
import PlayerSheet from './PlayerSheet';
import MiniLeagues from './MiniLeagues';

export default function LivePage() {
  const entryId = useEntryId();
  const bootstrapQ = useBootstrap();
  const healthQ = useHealth();
  const index = useBootstrapIndex(bootstrapQ.data);

  const gw = bootstrapQ.data?.currentEvent ?? bootstrapQ.data?.nextEvent ?? null;

  const liveQ = useEntryLive(entryId, gw);
  const live = liveQ.data?.isLive ?? healthQ.data?.live ?? false;
  const rankQ = useRankHistory(entryId, gw, live);
  const ladderQ = useLadder();

  const [selected, setSelected] = useState<EntryLivePickDto | null>(null);

  if (bootstrapQ.isPending) return <LoadingScreen label="Loading gameweek" />;
  if (bootstrapQ.isError || !index) {
    return <ErrorState error={bootstrapQ.error} onRetry={() => bootstrapQ.refetch()} />;
  }

  if (liveQ.isPending) return <LoadingScreen label="Loading your team" />;
  if (liveQ.isError || !liveQ.data) {
    return <ErrorState error={liveQ.error} onRetry={() => liveQ.refetch()} />;
  }

  const data = liveQ.data;
  const event = index.eventById.get(data.event);
  const computedNote =
    data.computedPoints !== data.official.eventPoints
      ? `Our live estimate: ${data.computedPoints}. FPL's official ${data.official.eventPoints} is the headline; small differences resolve as bonus and auto-subs finalise.`
      : null;

  return (
    <div className="space-y-3 py-3 fade-in">
      <LiveHeaderCard data={data} event={event} />

      {rankQ.data && <RankTrajectory samples={rankQ.data.samples} />}

      {ladderQ.data && (
        <RankLadder
          ladder={ladderQ.data}
          overallPoints={data.official.overallPoints}
          overallRank={data.official.overallRank}
        />
      )}

      <PitchView data={data} index={index} onSelect={setSelected} />

      {computedNote && (
        <p className="px-1 text-[11px] leading-relaxed text-faint">{computedNote}</p>
      )}

      <MiniLeagues leagues={data.entry.leagues} />

      <PlayerSheet
        pick={selected}
        element={selected ? index.elementById.get(selected.element) : undefined}
        teamShort={index.teamShort}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
