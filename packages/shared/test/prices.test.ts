import { describe, it, expect } from 'vitest';
import { initialPurchasePrice, sellingPrice, purchasePriceOf } from '../src/index';
import type { FplTransfer } from '../src/index';

describe('initialPurchasePrice (rule 3.7)', () => {
  it('is the start-of-season price (now_cost minus cost_change_start)', () => {
    expect(initialPurchasePrice(60, 0)).toBe(60);
    expect(initialPurchasePrice(130, 5)).toBe(125);
    expect(initialPurchasePrice(48, -2)).toBe(50); // player who dropped in price
  });
});

describe('sellingPrice (rule 3.7)', () => {
  it('returns now when the price has not risen', () => {
    expect(sellingPrice(100, 95)).toBe(95);
    expect(sellingPrice(100, 100)).toBe(100);
  });
  it('gives back half of the rise rounded down (per 0.2m)', () => {
    expect(sellingPrice(100, 104)).toBe(102);
    expect(sellingPrice(100, 103)).toBe(101);
    expect(sellingPrice(100, 110)).toBe(105);
    expect(sellingPrice(55, 62)).toBe(58);
  });
  it('rounds a single-tenth rise down to no profit', () => {
    expect(sellingPrice(100, 101)).toBe(100);
  });
});

function transfer(partial: Partial<FplTransfer>): FplTransfer {
  return {
    element_in: 0,
    element_in_cost: 0,
    element_out: 0,
    element_out_cost: 0,
    entry: 1,
    event: 1,
    time: '',
    ...partial,
  };
}

describe('purchasePriceOf (rule 3.7)', () => {
  it('uses the initial price for an original-squad player with no transfer', () => {
    expect(purchasePriceOf(42, [], 55)).toBe(55);
  });
  it('uses the buy cost from the transfer that brought the player in', () => {
    const transfers = [transfer({ element_in: 42, element_in_cost: 71 })];
    expect(purchasePriceOf(42, transfers, 55)).toBe(71);
  });
  it('uses the most recent buy when a player left and was bought back', () => {
    // newest first: bought back at 80, earlier bought at 70
    const transfers = [
      transfer({ element_in: 42, element_in_cost: 80, event: 6 }),
      transfer({ element_out: 42, element_out_cost: 78, event: 4 }),
      transfer({ element_in: 42, element_in_cost: 70, event: 2 }),
    ];
    expect(purchasePriceOf(42, transfers, 55)).toBe(80);
  });
});
