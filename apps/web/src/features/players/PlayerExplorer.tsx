import { useMemo, useState } from 'react';
import { formatPrice, type ElementDto } from '@fplq/shared';
import PlayerPhoto from '../../components/PlayerPhoto';
import SelectChevron from '../../components/SelectChevron';
import SortDirectionButton from '../../components/SortDirectionButton';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import {
  formatPlayerMetric,
  metricNeedsAppearances,
  PLAYER_METRICS,
  playerMetricValue,
  type AppearanceStats,
  type PlayerMetricKey,
} from './player-metrics';

interface Props {
  elements: ElementDto[];
  index: BootstrapIndex;
  selectedIds: [number | null, number | null];
  appearances: Record<number, AppearanceStats> | undefined;
  appearancesPending: boolean;
  appearancesError: boolean;
  onRetryAppearances: () => void;
  onAssign: (slot: 0 | 1, element: number) => void;
}

export default function PlayerExplorer({
  elements,
  index,
  selectedIds,
  appearances,
  appearancesPending,
  appearancesError,
  onRetryAppearances,
  onAssign,
}: Props) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(0);
  const [team, setTeam] = useState(0);
  const [metric, setMetric] = useState<PlayerMetricKey>('pointsPerGame');
  const [descending, setDescending] = useState(true);
  const [onlyPlayed, setOnlyPlayed] = useState(true);

  const players = useMemo(() => {
    const query = search.trim().toLowerCase();
    return elements
      .filter(
        (element) =>
          (!position || element.elementType === position) &&
          (!team || element.team === team) &&
          (!onlyPlayed || element.minutes > 0) &&
          (!query ||
            `${element.webName} ${element.firstName} ${element.secondName} ${index.teamShort(element.team)}`
              .toLowerCase()
              .includes(query))
      )
      .sort((a, b) => {
        const av = playerMetricValue(a, metric, appearances?.[a.id]);
        const bv = playerMetricValue(b, metric, appearances?.[b.id]);
        if (av == null) return bv == null ? a.id - b.id : 1;
        if (bv == null) return -1;
        return (descending ? bv - av : av - bv) || b.minutes - a.minutes || a.id - b.id;
      });
  }, [appearances, descending, elements, index, metric, onlyPlayed, position, search, team]);

  const nextSlot: 0 | 1 = selectedIds[0] == null ? 0 : 1;
  const needsAppearances = metricNeedsAppearances(metric);

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <div>
        <h2 className="text-base font-semibold">Find players</h2>
        <p className="mt-0.5 text-xs text-muted">
          Rank season stats per appearance, then add a player to either comparison slot.
        </p>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        type="search"
        inputMode="search"
        placeholder="Search player or club"
        aria-label="Search player explorer"
        className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-brand"
      />

      <div
        className="flex gap-1 rounded-xl bg-surface2 p-1"
        role="group"
        aria-label="Filter players by position"
      >
        {[0, 1, 2, 3, 4].map((type) => (
          <button
            key={type}
            onClick={() => setPosition(type)}
            aria-pressed={position === type}
            className={`min-h-10 flex-1 rounded-lg text-xs font-semibold ${position === type ? 'bg-brand text-black' : 'text-muted'}`}
          >
            {type ? index.typeShort(type) : 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="relative min-w-0">
          <select
            value={team}
            onChange={(event) => setTeam(Number(event.target.value))}
            aria-label="Filter players by club"
            className="min-h-11 w-full appearance-none rounded-xl border border-line bg-bg py-2 pl-3 pr-11 text-sm outline-none focus:border-brand"
          >
            <option value={0}>All clubs</option>
            {index.bootstrap.teams.map((club) => (
              <option key={club.id} value={club.id}>
                {club.shortName}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
        <button
          onClick={() => setOnlyPlayed((value) => !value)}
          aria-pressed={onlyPlayed}
          className={`min-h-11 rounded-xl border px-2 text-sm ${onlyPlayed ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-bg text-muted'}`}
        >
          {onlyPlayed ? 'Played only' : 'All players'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">Rank by</span>
        <SortDirectionButton
          ascending={!descending}
          onToggle={() => setDescending((value) => !value)}
          ariaLabel={`Player ranking: ${descending ? 'highest first' : 'lowest first'}`}
        />
      </div>
      <div
        className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1"
        role="group"
        aria-label="Player ranking metric"
      >
        {PLAYER_METRICS.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setMetric(item.key);
              setDescending(true);
            }}
            aria-pressed={metric === item.key}
            className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-medium ${metric === item.key ? 'bg-brand text-black' : 'bg-surface2 text-muted'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {needsAppearances && appearancesPending && (
        <p role="status" className="text-xs text-muted">
          Loading appearance-based stats…
        </p>
      )}
      {needsAppearances && appearancesError && (
        <p role="status" className="text-xs text-down">
          Could not load appearance counts.{' '}
          <button onClick={onRetryAppearances} className="min-h-10 text-brand">
            Retry
          </button>
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{players.length} players</span>
        <span>Add to comparison</span>
      </div>
      <ul className="max-h-[55dvh] divide-y divide-line overflow-y-auto overscroll-contain">
        {players.map((player) => {
          const value = playerMetricValue(player, metric, appearances?.[player.id]);
          return (
            <li
              key={player.id}
              className="grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-2"
            >
              <button
                className="flex min-w-0 items-center gap-2 text-left"
                onClick={() => onAssign(nextSlot, player.id)}
              >
                <PlayerPhoto
                  code={player.code}
                  name={player.webName}
                  className="h-11 w-9 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{player.webName}</span>
                  <span className="block text-[11px] text-muted">
                    {index.teamShort(player.team)} · {index.typeShort(player.elementType)} · £
                    {formatPrice(player.nowCost)}
                  </span>
                  <span className="num block text-xs text-accent">
                    {formatPlayerMetric(metric, value)}{' '}
                    {PLAYER_METRICS.find((item) => item.key === metric)?.label}
                  </span>
                </span>
              </button>
              {([0, 1] as const).map((slot) => {
                const selected = selectedIds[slot] === player.id;
                const usedElsewhere = selectedIds[slot === 0 ? 1 : 0] === player.id;
                return (
                  <button
                    key={slot}
                    onClick={() => onAssign(slot, player.id)}
                    disabled={usedElsewhere}
                    aria-label={`Use ${player.webName} as player ${slot + 1}`}
                    aria-pressed={selected}
                    className={`grid size-11 place-items-center rounded-xl text-xs font-bold ${selected ? 'bg-brand text-black' : 'bg-surface2 text-muted'} disabled:opacity-25`}
                  >
                    P{slot + 1}
                  </button>
                );
              })}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
