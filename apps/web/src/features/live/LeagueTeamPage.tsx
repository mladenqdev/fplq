import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { formatRank, type EntryLivePickDto } from '@fplq/shared';
import { EmptyState, ErrorState, LoadingScreen } from '../../components/states';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { useBootstrap, useEntryLive } from '../../lib/queries';
import LiveHeaderCard from './LiveHeaderCard';
import PitchView from './PitchView';
import PlayerSheet from './PlayerSheet';

function TeamLineup({ entryId }: { entryId: number }) {
  const bootstrapQ = useBootstrap();
  const index = useBootstrapIndex(bootstrapQ.data);
  const gw = bootstrapQ.data?.currentEvent ?? null;
  const liveQ = useEntryLive(entryId, gw);
  const [selected, setSelected] = useState<EntryLivePickDto | null>(null);

  if (bootstrapQ.isPending) return <LoadingScreen label="Loading gameweek" />;
  if (bootstrapQ.isError || !index) {
    return <ErrorState error={bootstrapQ.error} onRetry={() => bootstrapQ.refetch()} />;
  }
  if (gw == null) {
    return (
      <EmptyState>Team lineups will be available after the first gameweek deadline.</EmptyState>
    );
  }
  if (liveQ.isError) {
    return (
      <div>
        <p className="text-sm text-muted">This team's lineup is currently unavailable.</p>
        <ErrorState error={liveQ.error} onRetry={() => liveQ.refetch()} />
      </div>
    );
  }
  const data = liveQ.data;
  if (!data || data.entry.id !== entryId || data.event !== gw) {
    return <LoadingScreen label="Loading team lineup" />;
  }

  return (
    <>
      <header>
        <h1 className="break-words text-xl font-bold">{data.entry.name}</h1>
        <p className="mt-1 text-sm text-muted">{data.entry.playerName}</p>
        <p className="mt-1 text-xs text-faint">
          {formatRank(data.official.overallPoints)} total points · GW{data.event} lineup
        </p>
      </header>
      <LiveHeaderCard data={data} event={index.eventById.get(data.event)} />
      <p className="text-xs text-muted">
        Tap a player for points and match details. C = captain, V = vice-captain.
      </p>
      <PitchView data={data} index={index} onSelect={setSelected} />
      {data.computedPoints !== data.official.eventPoints && (
        <p className="text-xs leading-relaxed text-faint">
          Live estimate: {data.computedPoints} points. The headline shows FPL's official points;
          bonus and automatic substitutions may still be updating.
        </p>
      )}
      <PlayerSheet
        pick={selected}
        element={selected ? index.elementById.get(selected.element) : undefined}
        teamShort={index.teamShort}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export default function LeagueTeamPage() {
  const { id, entryId: rawEntryId } = useParams();
  const [searchParams] = useSearchParams();
  const entryId = Number(rawEntryId);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [entryId]);

  return (
    <div className="space-y-3 py-3 fade-in">
      <Link
        to={`/league/${id}?${searchParams.toString()}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-brand active:opacity-70"
      >
        <span aria-hidden>‹</span> Back to league
      </Link>
      {Number.isSafeInteger(entryId) && entryId > 0 ? (
        <TeamLineup key={entryId} entryId={entryId} />
      ) : (
        <EmptyState>This team link is invalid. Return to the league and select a team.</EmptyState>
      )}
    </div>
  );
}
