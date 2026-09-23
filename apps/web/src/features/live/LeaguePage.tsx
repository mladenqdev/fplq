import { Link, useParams, useSearchParams } from 'react-router';
import { useLeague } from '../../lib/queries';
import { useEntryId } from '../../stores/useEntryId';
import { ErrorState, LoadingScreen } from '../../components/states';
import RankDelta from '../../components/RankDelta';

function movementLabel(rank: number, lastRank: number): string {
  if (lastRank <= 0) return 'new to the league';
  const change = lastRank - rank;
  if (change > 0) return `up ${change} ${change === 1 ? 'place' : 'places'} since GW start`;
  if (change < 0) return `down ${-change} ${change === -1 ? 'place' : 'places'} since GW start`;
  return 'unchanged since GW start';
}

export default function LeaguePage() {
  const params = useParams();
  const id = Number(params.id);
  const entryId = useEntryId();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const setPage = (next: number) => setSearchParams({ page: String(next) });
  const { data, isPending, isError, error, refetch, isFetching } = useLeague(id, page);

  return (
    <div className="py-3">
      <Link
        to="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted active:opacity-70"
      >
        <span aria-hidden>‹</span> Live
      </Link>

      {isPending ? (
        <LoadingScreen label="Loading league" />
      ) : isError || !data ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <h1 className="mb-1 text-xl font-bold">{data.league.name}</h1>
          <p className="mb-3 text-xs text-muted">
            Page {data.standings.page} · Movement vs GW start · Tap a team for its lineup
          </p>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid grid-cols-[3.75rem_minmax(0,1fr)_2.5rem_3.25rem] gap-2 border-b border-line px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
              <span>Rank</span>
              <span>Team</span>
              <span className="text-right">GW</span>
              <span className="text-right">Total</span>
            </div>
            <ul className="divide-y divide-line">
              {data.standings.results.map((row) => {
                const isMe = row.entry === entryId;
                return (
                  <li key={row.entry}>
                    <Link
                      to={`/league/${id}/team/${row.entry}?page=${page}`}
                      aria-label={`View ${row.entry_name}, ${row.player_name}'s team, rank ${row.rank}, ${movementLabel(row.rank, row.last_rank)}`}
                      className={`grid min-h-14 grid-cols-[3.75rem_minmax(0,1fr)_2.5rem_3.25rem] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand active:bg-brand-soft ${
                        isMe ? 'bg-brand-soft' : ''
                      }`}
                    >
                      <span className="flex flex-col items-start gap-0.5">
                        <span className="num text-sm font-semibold leading-none text-fg">
                          {row.rank}
                        </span>
                        <RankDelta
                          current={row.rank}
                          previous={row.last_rank > 0 ? row.last_rank : null}
                          className="leading-none"
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium text-fg">
                          <span className="truncate">{row.entry_name}</span>
                          <span aria-hidden className="shrink-0 text-brand">
                            ›
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-faint">{row.player_name}</div>
                      </div>
                      <span className="num text-right text-sm text-muted">{row.event_total}</span>
                      <span className="num text-right text-sm font-semibold text-fg">
                        {row.total}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1 || isFetching}
              onClick={() => setPage(Math.max(1, page - 1))}
              className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium disabled:opacity-40 active:opacity-70"
            >
              Previous
            </button>
            <span className="num text-xs text-faint">page {page}</span>
            <button
              disabled={!data.standings.has_next || isFetching}
              onClick={() => setPage(page + 1)}
              className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium disabled:opacity-40 active:opacity-70"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
