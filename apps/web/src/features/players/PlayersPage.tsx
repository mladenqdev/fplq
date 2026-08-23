import { useEffect, useMemo, useState } from 'react';
import { formatPrice, type ElementDto } from '@fplq/shared';
import { useBootstrap, useFixtures } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { buildTeamFixtureIndex, type TeamFixtureItem } from '../../lib/team-fixtures';
import { ErrorState, LoadingScreen } from '../../components/states';
import PlayerRow from './PlayerRow';
import PlayerDetailSheet from './PlayerDetailSheet';
import CompareBar from './CompareBar';
import CompareSheet from './CompareSheet';
import { MAX_COMPARE } from './compare';
import { SORT_OPTIONS, sortValue, type SortKey } from './sorting';

const POSITIONS = [
  { id: 0, label: 'All' },
  { id: 1, label: 'GKP' },
  { id: 2, label: 'DEF' },
  { id: 3, label: 'MID' },
  { id: 4, label: 'FWD' },
];

export default function PlayersPage() {
  const bootstrapQ = useBootstrap();
  const fixturesQ = useFixtures();
  const index = useBootstrapIndex(bootstrapQ.data);

  const [position, setPosition] = useState(0);
  const [team, setTeam] = useState(0);
  const [maxPrice, setMaxPrice] = useState(150);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalPoints');
  const [selected, setSelected] = useState<ElementDto | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const fixtureIndex = useMemo(
    () =>
      fixturesQ.data ? buildTeamFixtureIndex(fixturesQ.data) : new Map<string, TeamFixtureItem[]>(),
    [fixturesQ.data]
  );

  const filtered = useMemo(() => {
    if (!bootstrapQ.data) return [];
    const q = search.trim().toLowerCase();
    const list = bootstrapQ.data.elements.filter((el) => {
      if (position && el.elementType !== position) return false;
      if (team && el.team !== team) return false;
      if (el.nowCost > maxPrice) return false;
      if (q && !el.webName.toLowerCase().includes(q) && !el.secondName.toLowerCase().includes(q))
        return false;
      return true;
    });
    list.sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey));
    return list;
  }, [bootstrapQ.data, position, team, maxPrice, search, sortKey]);

  const comparePlayers = useMemo(
    () =>
      compareIds.map((id) => index?.elementById.get(id)).filter((e): e is ElementDto => e != null),
    [compareIds, index]
  );

  useEffect(() => {
    if (compareOpen && comparePlayers.length < 2) setCompareOpen(false);
  }, [compareOpen, comparePlayers.length]);

  if (bootstrapQ.isPending) return <LoadingScreen label="Loading players" />;
  if (bootstrapQ.isError || !index || !bootstrapQ.data) {
    return <ErrorState error={bootstrapQ.error} onRetry={() => bootstrapQ.refetch()} />;
  }

  const nextEvent = bootstrapQ.data.nextEvent ?? bootstrapQ.data.currentEvent ?? null;

  const toggleCompareMode = () => {
    if (compareMode) {
      setCompareIds([]);
      setCompareOpen(false);
    } else {
      setSelected(null);
    }
    setCompareMode((on) => !on);
  };

  const toggleCompare = (id: number) =>
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARE
          ? prev
          : [...prev, id]
    );

  const removeCompare = (id: number) => setCompareIds((prev) => prev.filter((x) => x !== id));

  const clearCompare = () => {
    setCompareIds([]);
    setCompareOpen(false);
  };

  const showBar = compareMode;

  return (
    <div className={`py-3 ${showBar ? 'pb-24' : ''}`}>
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-3 mb-2 space-y-2 border-b border-line bg-bg/95 px-3 pb-2.5 pt-1 backdrop-blur">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-2">
          <div className="flex flex-1 overflow-hidden rounded-lg bg-surface2 text-xs font-medium">
            {POSITIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPosition(p.id)}
                className={`flex-1 py-1.5 ${position === p.id ? 'bg-accent text-black' : 'text-muted'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={team}
            onChange={(e) => setTeam(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none"
          >
            <option value={0}>All clubs</option>
            {bootstrapQ.data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.shortName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex flex-1 items-center gap-2 text-xs text-muted">
            <span className="num whitespace-nowrap">≤ £{formatPrice(maxPrice)}</span>
            <input
              type="range"
              min={40}
              max={150}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-(--accent)"
            />
          </label>
          <button
            onClick={toggleCompareMode}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              compareMode ? 'bg-accent text-black' : 'bg-surface2 text-muted'
            }`}
          >
            Compare
          </button>
          <span className="num text-[11px] text-faint">{filtered.length}</span>
        </div>
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                sortKey === opt.key ? 'bg-brand text-black' : 'bg-surface2 text-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {compareMode && (
        <p className="mb-2 px-1 text-[11px] text-muted">
          Select up to {MAX_COMPARE} players to compare head to head.
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No players match.</p>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((el) => {
              const checked = compareIds.includes(el.id);
              return (
                <PlayerRow
                  key={el.id}
                  element={el}
                  index={index}
                  sortKey={sortKey}
                  onClick={() => (compareMode ? toggleCompare(el.id) : setSelected(el))}
                  selectable={compareMode}
                  checked={checked}
                  disabled={compareMode && !checked && compareIds.length >= MAX_COMPARE}
                />
              );
            })}
          </div>
        )}
      </div>

      <PlayerDetailSheet
        element={compareMode ? null : selected}
        index={index}
        fixtureIndex={fixtureIndex}
        nextEvent={nextEvent}
        onClose={() => setSelected(null)}
      />

      {showBar && (
        <CompareBar
          players={comparePlayers}
          onRemove={removeCompare}
          onClear={clearCompare}
          onCompare={() => setCompareOpen(true)}
        />
      )}

      {compareOpen && (
        <CompareSheet
          players={comparePlayers}
          index={index}
          onRemove={removeCompare}
          onClear={clearCompare}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
