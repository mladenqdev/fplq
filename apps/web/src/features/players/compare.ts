import { formatPrice, type ElementDto } from '@fplq/shared';

export const MAX_COMPARE = 3;

export type WinDirection = 'higher' | 'lower';

export interface CompareStat {
  key: string;
  label: string;
  direction: WinDirection;
  value: (el: ElementDto) => number | null;
  fmt: (n: number) => string;
}

export interface CompareGroup {
  title: string;
  stats: CompareStat[];
}

const int = (n: number) => String(n);
const one = (n: number) => n.toFixed(1);
const two = (n: number) => n.toFixed(2);
const pct = (n: number) => `${n}%`;
const price = (n: number) => `£${formatPrice(n)}`;

function pointsPerMillion(el: ElementDto): number | null {
  if (el.nowCost <= 0) return null;
  return el.totalPoints / (el.nowCost / 10);
}

export const COMPARE_GROUPS: CompareGroup[] = [
  {
    title: 'Form & points',
    stats: [
      {
        key: 'totalPoints',
        label: 'Total points',
        direction: 'higher',
        value: (e) => e.totalPoints,
        fmt: int,
      },
      {
        key: 'pointsPerGame',
        label: 'Points / game',
        direction: 'higher',
        value: (e) => e.pointsPerGame,
        fmt: one,
      },
      { key: 'form', label: 'Form', direction: 'higher', value: (e) => e.form, fmt: one },
      { key: 'epNext', label: 'xPts next', direction: 'higher', value: (e) => e.epNext, fmt: one },
      {
        key: 'selectedByPercent',
        label: 'Ownership',
        direction: 'higher',
        value: (e) => e.selectedByPercent,
        fmt: pct,
      },
    ],
  },
  {
    title: 'Attack',
    stats: [
      {
        key: 'goalsScored',
        label: 'Goals',
        direction: 'higher',
        value: (e) => e.goalsScored,
        fmt: int,
      },
      { key: 'assists', label: 'Assists', direction: 'higher', value: (e) => e.assists, fmt: int },
      { key: 'xg', label: 'xG', direction: 'higher', value: (e) => e.xg, fmt: two },
      { key: 'xa', label: 'xA', direction: 'higher', value: (e) => e.xa, fmt: two },
      { key: 'xgi', label: 'xGI', direction: 'higher', value: (e) => e.xgi, fmt: two },
      { key: 'xgi90', label: 'xGI / 90', direction: 'higher', value: (e) => e.xgi90, fmt: two },
      {
        key: 'ictIndex',
        label: 'ICT index',
        direction: 'higher',
        value: (e) => e.ictIndex,
        fmt: one,
      },
    ],
  },
  {
    title: 'Minutes & value',
    stats: [
      { key: 'minutes', label: 'Minutes', direction: 'higher', value: (e) => e.minutes, fmt: int },
      { key: 'starts', label: 'Starts', direction: 'higher', value: (e) => e.starts, fmt: int },
      { key: 'nowCost', label: 'Price', direction: 'lower', value: (e) => e.nowCost, fmt: price },
      {
        key: 'pointsPerMillion',
        label: 'Points / £m',
        direction: 'higher',
        value: pointsPerMillion,
        fmt: one,
      },
    ],
  },
  {
    title: 'Defence',
    stats: [
      {
        key: 'cleanSheets',
        label: 'Clean sheets',
        direction: 'higher',
        value: (e) => e.cleanSheets,
        fmt: int,
      },
      { key: 'xgc90', label: 'xGC / 90', direction: 'lower', value: (e) => e.xgc90, fmt: two },
      {
        key: 'defensiveContribution',
        label: 'Def. contribution',
        direction: 'higher',
        value: (e) => e.defensiveContribution,
        fmt: int,
      },
      { key: 'bonus', label: 'Bonus', direction: 'higher', value: (e) => e.bonus, fmt: int },
      { key: 'bps', label: 'BPS', direction: 'higher', value: (e) => e.bps, fmt: int },
    ],
  },
];

// Best value across the compared players for one stat, or null when every
// present player ties (no clear winner) or all are missing.
export function bestValue(stat: CompareStat, els: ElementDto[]): number | null {
  const vals = els.map(stat.value).filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  if (vals.every((v) => v === vals[0])) return null;
  return stat.direction === 'higher' ? Math.max(...vals) : Math.min(...vals);
}

export function displayValue(stat: CompareStat, el: ElementDto): string {
  const v = stat.value(el);
  return v == null ? '–' : stat.fmt(v);
}
