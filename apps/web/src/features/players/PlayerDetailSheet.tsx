import { formatPrice, type ElementDto } from '@fplq/shared';
import BottomSheet from '../../components/BottomSheet';
import PlayerPhoto from '../../components/PlayerPhoto';
import FixtureStrip from '../../components/FixtureStrip';
import { Spinner } from '../../components/states';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import { useElement } from '../../lib/queries';
import { teamFixtures, type TeamFixtureItem } from '../../lib/team-fixtures';

interface Props {
  element: ElementDto | null;
  index: BootstrapIndex;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  nextEvent: number | null;
  onClose: () => void;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-faint">{label}</div>
      <div className="num text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

export default function PlayerDetailSheet({
  element,
  index,
  fixtureIndex,
  nextEvent,
  onClose,
}: Props) {
  const summaryQ = useElement(element?.id ?? null);
  const strip =
    element && nextEvent != null ? teamFixtures(fixtureIndex, element.team, nextEvent, 5) : [];
  const last5 = summaryQ.data ? [...summaryQ.data.history].slice(-5).reverse() : [];

  return (
    <BottomSheet open={element != null} onClose={onClose} title={element?.webName ?? ''}>
      {element && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <PlayerPhoto
              code={element.code}
              name={element.webName}
              className="h-20 w-16 rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold">
                {element.firstName} {element.webName}
              </div>
              <div className="num text-sm text-muted">
                {index.teamShort(element.team)} · {index.typeShort(element.elementType)} · £
                {formatPrice(element.nowCost)}
              </div>
            </div>
          </div>

          {element.status !== 'a' && element.news && (
            <div className="rounded-lg bg-warn/15 px-3 py-2 text-xs text-warn">{element.news}</div>
          )}

          <div className="grid grid-cols-4 gap-1.5">
            <Stat label="Pts" value={element.totalPoints} />
            <Stat label="Form" value={element.form.toFixed(1)} />
            <Stat label="PPG" value={element.pointsPerGame.toFixed(1)} />
            <Stat label="xPts" value={element.epNext.toFixed(1)} />
            <Stat label="Mins" value={element.minutes} />
            <Stat label="Goals" value={element.goalsScored} />
            <Stat label="Assist" value={element.assists} />
            <Stat label="xGI/90" value={element.xgi90.toFixed(2)} />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-faint">Ownership</div>
              <div className="num text-sm font-semibold">{element.selectedByPercent}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-faint">Price change</div>
              <div
                className={`num text-sm font-semibold ${
                  element.priceChangePercent > 0
                    ? 'text-up'
                    : element.priceChangePercent < 0
                      ? 'text-down'
                      : 'text-muted'
                }`}
              >
                {element.priceChangePercent > 0 ? '▲' : element.priceChangePercent < 0 ? '▼' : '·'}{' '}
                {Math.abs(element.priceChangePercent)}% to change
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
              Next 5
            </h3>
            {nextEvent != null ? (
              <FixtureStrip gws={strip} index={index} />
            ) : (
              <p className="text-sm text-muted">Season complete.</p>
            )}
          </div>

          <div>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
              Recent gameweeks
            </h3>
            {summaryQ.isPending ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : last5.length === 0 ? (
              <p className="text-sm text-muted">No gameweeks played yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {last5.map((h) => (
                  <li
                    key={h.round}
                    className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 px-3 py-2"
                  >
                    <span className="num text-xs text-faint">GW{h.round}</span>
                    <span className="text-sm">
                      {index.teamShort(h.opponent_team)} ({h.was_home ? 'H' : 'A'}) ·{' '}
                      <span className="num text-muted">{h.minutes}&apos;</span>
                    </span>
                    <span className="num text-sm font-semibold">{h.total_points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
