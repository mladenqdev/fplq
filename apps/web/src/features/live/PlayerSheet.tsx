import type { ElementDto, EntryLivePickDto } from '@fplq/shared';
import BottomSheet from '../../components/BottomSheet';
import PlayerPhoto from '../../components/PlayerPhoto';

interface Props {
  pick: EntryLivePickDto | null;
  element: ElementDto | undefined;
  teamShort: (id: number) => string;
  onClose: () => void;
}

const EXPLAIN_LABELS: Record<string, string> = {
  minutes: 'Minutes',
  goals_scored: 'Goals',
  assists: 'Assists',
  clean_sheets: 'Clean sheet',
  goals_conceded: 'Goals conceded',
  own_goals: 'Own goals',
  penalties_saved: 'Penalty saved',
  penalties_missed: 'Penalty missed',
  yellow_cards: 'Yellow card',
  red_cards: 'Red card',
  saves: 'Saves',
  bonus: 'Bonus',
  defensive_contribution: 'Defensive contribution',
  starts: 'Starts',
};

function label(id: string): string {
  return EXPLAIN_LABELS[id] ?? id.replace(/_/g, ' ');
}

export default function PlayerSheet({ pick, element, teamShort, onClose }: Props) {
  return (
    <BottomSheet open={pick != null} onClose={onClose} title={pick?.webName ?? ''}>
      {pick && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <PlayerPhoto
              code={element?.code ?? pick.photo}
              name={pick.webName}
              className="h-16 w-[3.2rem] rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{pick.webName}</span>
                {pick.isCaptain && (
                  <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-black text-black">
                    C
                  </span>
                )}
                {pick.isViceCaptain && (
                  <span className="grid size-5 place-items-center rounded-full bg-surface2 text-[10px] font-black text-fg">
                    V
                  </span>
                )}
              </div>
              <div className="num text-sm text-muted">
                {teamShort(pick.team)} · {pick.minutes}&apos; · ×{pick.effectiveMultiplier}
              </div>
            </div>
            <div className="text-right">
              <div className="num text-3xl font-black leading-none">{pick.points}</div>
              <div className="text-[10px] text-faint">points</div>
            </div>
          </div>

          {element?.status && element.status !== 'a' && element.news && (
            <div className="rounded-lg bg-warn/15 px-3 py-2 text-xs text-warn">{element.news}</div>
          )}

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
              Points breakdown
            </h3>
            {pick.explain.length === 0 ? (
              <p className="text-sm text-muted">No points yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {pick.explain.map((row, i) => (
                  <li
                    key={`${row.identifier}-${i}`}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-fg">{label(row.identifier)}</span>
                    <span className="num text-sm text-muted">
                      {row.value}
                      <span
                        className={`ml-2 font-semibold ${row.points >= 0 ? 'text-fg' : 'text-down'}`}
                      >
                        {row.points > 0 ? `+${row.points}` : row.points}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!pick.bonusConfirmed && pick.provisionalBonus > 0 && (
              <p className="num mt-1.5 text-xs text-warn">
                Includes +{pick.provisionalBonus} provisional bonus (bps {pick.bps}).
              </p>
            )}
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
              Fixtures
            </h3>
            <ul className="space-y-1">
              {pick.fixtures.length === 0 ? (
                <li className="text-sm text-muted">No fixture this gameweek (blank).</li>
              ) : (
                pick.fixtures.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-sm"
                  >
                    <span>
                      {teamShort(f.opponent)} ({f.isHome ? 'H' : 'A'})
                    </span>
                    <span className="num text-muted">{f.score ?? (f.started ? 'live' : '—')}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
