import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice, type ElementDto } from '@fplq/shared';
import PlayerDetailSheet from '../players/PlayerDetailSheet';
import FixtureStrip from '../../components/FixtureStrip';
import PlayerPhoto from '../../components/PlayerPhoto';
import { usePlayerDefcons } from '../../lib/queries';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import { teamFixtures, type TeamFixtureItem } from '../../lib/team-fixtures';

export interface TransferTarget {
  outElement: number;
  event: number;
  budget: number;
  elementType: number;
  squad: number[];
}

interface Props {
  target: TransferTarget | null;
  event: number;
  squad: number[];
  incoming: ElementDto | undefined;
  index: BootstrapIndex;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onSelect: (inElement: number) => void;
  onClose: () => void;
}

type CandidateSort =
  'epNext' | 'totalPoints' | 'form' | 'nowCost' | 'selectedByPercent' | 'defconsPerGame';
const SORTS: { key: CandidateSort; label: string }[] = [
  { key: 'epNext', label: 'xPts' },
  { key: 'totalPoints', label: 'Points' },
  { key: 'defconsPerGame', label: 'Defcons / game' },
  { key: 'form', label: 'Form' },
  { key: 'nowCost', label: 'Price' },
  { key: 'selectedByPercent', label: 'Owned' },
];

export default function TransferPanel({
  target,
  event,
  squad: squadIds,
  incoming,
  index,
  fixtureIndex,
  onSelect,
  onClose,
}: Props) {
  const [details, setDetails] = useState<ElementDto | null>(null);
  const [search, setSearch] = useState('');
  const [club, setClub] = useState(0);
  const [position, setPosition] = useState(0);
  const [sort, setSort] = useState<CandidateSort>('epNext');
  const [ascending, setAscending] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [sort, ascending, search, club, position, target?.outElement]);
  const defconsQ = usePlayerDefcons(sort === 'defconsPerGame');
  const outEl = target ? index.elementById.get(target.outElement) : undefined;

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const squad = new Set(squadIds);
    const type = target?.elementType ?? position;
    const list = index.bootstrap.elements
      .map((el) => ({ ...el, defconsPerGame: defconsQ.data?.players[el.id]?.perGame }))
      .filter(
        (el) =>
          (!type || el.elementType === type) &&
          !squad.has(el.id) &&
          (!club || el.team === club) &&
          (!q || el.webName.toLowerCase().includes(q) || el.secondName.toLowerCase().includes(q))
      );
    list.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (av == null) return bv == null ? a.id - b.id : 1;
      if (bv == null) return -1;
      return (ascending ? av - bv : bv - av) || a.id - b.id;
    });
    return list;
  }, [target, squadIds, position, index, search, sort, ascending, club, defconsQ.data]);

  const title = outEl ? `Replace ${outEl.webName}` : 'Players';

  return (
    <section
      className="min-w-0 rounded-2xl border border-line bg-surface p-3"
      aria-label="Transfer candidates"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {(target || incoming) && (
          <button onClick={onClose} className="px-2 py-1 text-xs text-muted">
            Clear selection
          </button>
        )}
      </div>
      {!target && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-xs ${incoming ? 'bg-brand-soft text-brand' : 'bg-surface2 text-muted'}`}
          role="status"
        >
          {incoming
            ? `Select a ${index.typeShort(incoming.elementType)} on the pitch to bring in ${incoming.webName}.`
            : 'Choose a player here or select someone on your pitch to replace.'}
        </p>
      )}
      <div className="space-y-3">
        {target && (
          <div className="num flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-xs text-muted">
            <span>GW{target.event} transfer</span>
            <span>Budget £{formatPrice(target.budget)}</span>
          </div>
        )}
        <div className="flex rounded-lg bg-surface2 p-1">
          {[0, 1, 2, 3, 4].map((type) => (
            <button
              key={type}
              onClick={() => {
                setPosition(type);
                onClose();
              }}
              aria-pressed={(target?.elementType ?? position) === type}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${(target?.elementType ?? position) === type ? 'bg-brand text-black' : 'text-muted'}`}
            >
              {type === 0 ? 'All' : index.typeShort(type)}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidates"
          aria-label="Search candidates"
          className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          value={club}
          onChange={(e) => setClub(Number(e.target.value))}
          aria-label="Filter candidates by club"
          className="w-full rounded-lg border border-line bg-bg px-2 py-2 text-xs"
        >
          <option value={0}>All clubs</option>
          {index.bootstrap.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted">Sort by</span>
          <button
            onClick={() => setAscending((value) => !value)}
            aria-label={`Sort direction: ${ascending ? 'lowest first' : 'highest first'}. Click to reverse`}
            className="rounded-lg bg-surface2 px-3 py-1.5 text-xs font-medium text-muted hover:text-fg"
          >
            {ascending ? '↑ Lowest first' : '↓ Highest first'}
          </button>
        </div>
        <div role="group" aria-label="Sort candidates by" className="flex flex-wrap gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                if (sort !== s.key) {
                  setSort(s.key);
                  setAscending(s.key === 'nowCost');
                }
              }}
              aria-pressed={sort === s.key}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                sort === s.key ? 'bg-brand text-black' : 'bg-surface2 text-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {sort === 'defconsPerGame' && (
          <p className="text-xs text-muted" role="status">
            {defconsQ.isPending ? (
              'Loading defensive contributions per appearance…'
            ) : defconsQ.isError ? (
              <>
                Could not load Defcons.{' '}
                <button onClick={() => defconsQ.refetch()} className="text-brand underline">
                  Retry
                </button>
              </>
            ) : (
              'Average defensive actions per appearance.'
            )}
          </p>
        )}
        {candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No players match your search.</p>
        ) : (
          <ul
            ref={listRef}
            className="max-h-[45dvh] space-y-1.5 overflow-y-auto overscroll-contain lg:max-h-[60dvh]"
          >
            {candidates.map((el) => (
              <Candidate
                key={el.id}
                el={el}
                index={index}
                event={event}
                budget={target?.budget ?? null}
                selected={incoming?.id === el.id}
                sort={sort}
                fixtureIndex={fixtureIndex}
                onSelect={() => onSelect(el.id)}
                onDetails={() => setDetails(el)}
              />
            ))}
          </ul>
        )}
      </div>
      <PlayerDetailSheet
        element={details}
        index={index}
        fixtureIndex={fixtureIndex}
        nextEvent={event}
        onClose={() => setDetails(null)}
      />
    </section>
  );
}

function Candidate({
  el,
  index,
  event,
  budget,
  selected,
  sort,
  fixtureIndex,
  onSelect,
  onDetails,
}: {
  el: ElementDto;
  index: BootstrapIndex;
  event: number;
  budget: number | null;
  selected: boolean;
  sort: CandidateSort;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const strip = teamFixtures(fixtureIndex, el.team, event, 3);
  const priceArrow = el.priceChangePercent > 0 ? '▲' : el.priceChangePercent < 0 ? '▼' : '·';
  const priceColor =
    el.priceChangePercent > 0 ? 'text-up' : el.priceChangePercent < 0 ? 'text-down' : 'text-faint';

  return (
    <li>
      <button
        onClick={onSelect}
        aria-label={`Select ${el.webName}`}
        aria-pressed={selected}
        className={`w-full rounded-xl border ${selected ? 'border-brand bg-brand-soft' : 'border-line bg-surface'} p-2.5 text-left hover:bg-surface2 active:bg-surface2`}
      >
        <div className="flex items-center justify-between gap-2">
          <PlayerPhoto code={el.code} name={el.webName} className="h-10 w-8 shrink-0 rounded" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-fg">{el.webName}</span>
              {el.status !== 'a' && (
                <span
                  className={`size-1.5 rounded-full ${el.status === 'd' ? 'bg-warn' : 'bg-down'}`}
                />
              )}
            </div>
            <div className="num text-[11px] text-faint">
              {index.teamShort(el.team)}
              {sort !== 'selectedByPercent' && <> · {el.selectedByPercent}% own</>} ·{' '}
              <span className={priceColor}>
                {priceArrow} {Math.abs(el.priceChangePercent)}%
              </span>
            </div>
          </div>
          <div className="num shrink-0 text-right">
            <div className={`text-sm font-semibold ${sort === 'nowCost' ? 'text-accent-dim' : ''}`}>
              £{formatPrice(el.nowCost)}
            </div>
            {budget != null && el.nowCost > budget && (
              <div className="text-[11px] text-down">
                £{formatPrice(el.nowCost - budget)} over budget
              </div>
            )}
            {sort !== 'nowCost' && (
              <div className="text-[11px] text-accent-dim">
                {sort === 'defconsPerGame'
                  ? `${el.defconsPerGame?.toFixed(1) ?? '—'} DC/game`
                  : sort === 'totalPoints'
                    ? `${el.totalPoints} pts`
                    : sort === 'form'
                      ? `${el.form.toFixed(1)} form`
                      : sort === 'selectedByPercent'
                        ? `${el.selectedByPercent}% owned`
                        : `${el.epNext.toFixed(1)} xPts`}
              </div>
            )}
          </div>
        </div>
        <div className="mt-1.5">
          <FixtureStrip gws={strip} index={index} />
        </div>
        {el.news && <div className="mt-1.5 truncate text-[11px] text-warn">{el.news}</div>}
      </button>
      <button
        onClick={onDetails}
        aria-label={`View stats for ${el.webName}`}
        className="min-h-11 w-full text-xs text-brand"
      >
        View player stats
      </button>
    </li>
  );
}
