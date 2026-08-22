import { Link } from 'react-router';
import { formatRank, type EntryLeagueDto } from '@fplq/shared';
import RankDelta from '../../components/RankDelta';

interface Props {
  leagues: EntryLeagueDto[];
}

export default function MiniLeagues({ leagues }: Props) {
  if (leagues.length === 0) return null;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 text-sm font-semibold text-fg">Mini-leagues</h2>
      <ul className="divide-y divide-line">
        {leagues.map((lg) => {
          // GW1 has no previous position (entryLastRank 0); treat that as "new".
          const previous = lg.entryLastRank > 0 ? lg.entryLastRank : null;
          return (
            <li key={lg.id}>
              <Link
                to={`/league/${lg.id}`}
                className="flex items-center justify-between gap-3 py-2.5 active:opacity-70"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-fg">{lg.name}</div>
                  <div className="num text-[11px] text-faint">
                    {lg.rankCount.toLocaleString()} teams
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RankDelta current={lg.entryRank} previous={previous} />
                  <span className="num w-16 text-right text-sm font-semibold text-fg">
                    {formatRank(lg.entryRank)}
                  </span>
                  <span className="text-faint">›</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
