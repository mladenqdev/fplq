import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useLeague } from '../../lib/queries';
import { useEntryId } from '../../stores/useEntryId';
import { ErrorState, LoadingScreen } from '../../components/states';

export default function LeaguePage() {
  const params = useParams();
  const id = Number(params.id);
  const entryId = useEntryId();
  const [page, setPage] = useState(1);
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
          <p className="mb-3 text-xs text-faint">Page {data.standings.page}</p>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid grid-cols-[2.5rem_1fr_3rem_3.5rem] gap-2 border-b border-line px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
              <span>Rank</span>
              <span>Team</span>
              <span className="text-right">GW</span>
              <span className="text-right">Total</span>
            </div>
            <ul className="divide-y divide-line">
              {data.standings.results.map((row) => {
                const isMe = row.entry === entryId;
                return (
                  <li
                    key={row.entry}
                    className={`grid grid-cols-[2.5rem_1fr_3rem_3.5rem] items-center gap-2 px-3 py-2.5 ${
                      isMe ? 'bg-brand-soft' : ''
                    }`}
                  >
                    <span className="num text-sm font-semibold text-fg">{row.rank}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-fg">{row.entry_name}</div>
                      <div className="truncate text-[11px] text-faint">{row.player_name}</div>
                    </div>
                    <span className="num text-right text-sm text-muted">{row.event_total}</span>
                    <span className="num text-right text-sm font-semibold text-fg">
                      {row.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium disabled:opacity-40 active:opacity-70"
            >
              Previous
            </button>
            <span className="num text-xs text-faint">page {page}</span>
            <button
              disabled={!data.standings.has_next || isFetching}
              onClick={() => setPage((p) => p + 1)}
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
