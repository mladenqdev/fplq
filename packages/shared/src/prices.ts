// Rule 3.7: purchase and selling price. All values in tenths of a million.

import type { FplTransfer } from './fpl-types';

// Start-of-season price for a player still owned from the initial squad.
export function initialPurchasePrice(nowCost: number, costChangeStart: number): number {
  return nowCost - costChangeStart;
}

// Profit is 50% of the rise, rounded down per 0.1m (per 0.2m rise). No loss on a drop.
export function sellingPrice(purchase: number, now: number): number {
  if (now <= purchase) return now;
  return purchase + Math.floor((now - purchase) / 2);
}

// Purchase price of a currently owned player: the cost of the most recent transfer
// that brought them in (transfers are newest-first), else the initial squad price.
export function purchasePriceOf(
  element: number,
  transfersNewestFirst: FplTransfer[],
  initialPrice: number
): number {
  const bought = transfersNewestFirst.find((t) => t.element_in === element);
  return bought ? bought.element_in_cost : initialPrice;
}
