import type { ElementDto } from '@fplq/shared';

export type SortKey =
  | 'totalPoints'
  | 'form'
  | 'epNext'
  | 'nowCost'
  | 'selectedByPercent'
  | 'xgi90'
  | 'minutes'
  | 'priceChangePercent';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'totalPoints', label: 'Points' },
  { key: 'form', label: 'Form' },
  { key: 'epNext', label: 'xPts' },
  { key: 'nowCost', label: 'Price' },
  { key: 'selectedByPercent', label: 'Owned' },
  { key: 'xgi90', label: 'xGI/90' },
  { key: 'minutes', label: 'Mins' },
  { key: 'priceChangePercent', label: 'Δ Price' },
];

export function sortValue(el: ElementDto, key: SortKey): number {
  return el[key];
}
