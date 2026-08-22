import { useMemo, useState } from 'react';
import { formatPrice, type ElementDto } from '@fplq/shared';
import BottomSheet from '../../components/BottomSheet';
import FixtureStrip from '../../components/FixtureStrip';
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
  index: BootstrapIndex;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onSelect: (inElement: number) => void;
  onClose: () => void;
}

type CandidateSort = 'epNext' | 'totalPoints' | 'form' | 'nowCost' | 'selectedByPercent';
const SORTS: { key: CandidateSort; label: string }[] = [
  { key: 'epNext', label: 'xPts' },
  { key: 'totalPoints', label: 'Points' },
  { key: 'form', label: 'Form' },
  { key: 'nowCost', label: 'Price' },
  { key: 'selectedByPercent', label: 'Owned' },
];

export default function TransferSheet({ target, index, fixtureIndex, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<CandidateSort>('epNext');
  const outEl = target ? index.elementById.get(target.outElement) : undefined;

  const candidates = useMemo(() => {
    if (!target) return [];
    const q = search.trim().toLowerCase();
    const squad = new Set(target.squad);
    const list = index.bootstrap.elements.filter(
      (el) =>
        el.elementType === target.elementType &&
        !squad.has(el.id) &&
        el.nowCost <= target.budget &&
        (!q || el.webName.toLowerCase().includes(q) || el.secondName.toLowerCase().includes(q))
    );
    const asc = sort === 'nowCost';
    list.sort((a, b) => (asc ? a[sort] - b[sort] : b[sort] - a[sort]));
    return list.slice(0, 60);
  }, [target, index, search, sort]);

  const title = outEl ? `Replace ${outEl.webName}` : 'Transfer';

  return (
    <BottomSheet open={target != null} onClose={onClose} title={title}>
      {target && (
        <div className="space-y-3">
          <div className="num flex items-center justify-between rounded-lg bg-surface2 px-3 py-2 text-xs text-muted">
            <span>GW{target.event} transfer</span>
            <span>Budget £{formatPrice(target.budget)}</span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates"
            className="w-full rounded-xl border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  sort === s.key ? 'bg-brand text-black' : 'bg-surface2 text-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No affordable {index.typeShort(target.elementType)} available.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {candidates.map((el) => (
                <Candidate
                  key={el.id}
                  el={el}
                  index={index}
                  event={target.event}
                  fixtureIndex={fixtureIndex}
                  onSelect={() => onSelect(el.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function Candidate({
  el,
  index,
  event,
  fixtureIndex,
  onSelect,
}: {
  el: ElementDto;
  index: BootstrapIndex;
  event: number;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onSelect: () => void;
}) {
  const strip = teamFixtures(fixtureIndex, el.team, event, 5);
  const priceArrow = el.priceChangePercent > 0 ? '▲' : el.priceChangePercent < 0 ? '▼' : '·';
  const priceColor =
    el.priceChangePercent > 0 ? 'text-up' : el.priceChangePercent < 0 ? 'text-down' : 'text-faint';

  return (
    <li>
      <button
        onClick={onSelect}
        className="w-full rounded-xl border border-line bg-surface p-2.5 text-left active:bg-surface2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-fg">{el.webName}</span>
              {el.status !== 'a' && (
                <span
                  className={`size-1.5 rounded-full ${el.status === 'd' ? 'bg-warn' : 'bg-down'}`}
                />
              )}
            </div>
            <div className="num text-[11px] text-faint">
              {index.teamShort(el.team)} · {el.selectedByPercent}% own ·{' '}
              <span className={priceColor}>
                {priceArrow} {Math.abs(el.priceChangePercent)}%
              </span>
            </div>
          </div>
          <div className="num shrink-0 text-right">
            <div className="text-sm font-semibold">£{formatPrice(el.nowCost)}</div>
            <div className="text-[11px] text-accent-dim">{el.epNext.toFixed(1)} xPts</div>
          </div>
        </div>
        <div className="mt-1.5">
          <FixtureStrip gws={strip} index={index} />
        </div>
        {el.news && <div className="mt-1.5 truncate text-[11px] text-warn">{el.news}</div>}
      </button>
    </li>
  );
}
