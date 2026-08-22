import { describe, it, expect } from 'vitest';
import { fdrBand, fdrColor, gwTickerScore, tickerScore, BLANK_DIFFICULTY } from '../src/index';

describe('fdrBand (rule 3.9)', () => {
  it('maps difficulty to bands', () => {
    expect(fdrBand(1)).toBe('good');
    expect(fdrBand(2)).toBe('good');
    expect(fdrBand(3)).toBe('neutral');
    expect(fdrBand(4)).toBe('bad');
    expect(fdrBand(5)).toBe('severe');
  });
});

describe('fdrColor (rule 3.9)', () => {
  it('gives distinct colors and shares a family for 1 and 2', () => {
    expect(fdrColor(1)).not.toBe(fdrColor(3));
    expect(fdrColor(5)).not.toBe(fdrColor(4));
    expect(new Set([1, 2, 3, 4, 5].map(fdrColor)).size).toBe(5);
  });
});

describe('ticker score (rule 3.9)', () => {
  it('a blank GW counts as 5', () => {
    expect(gwTickerScore([])).toBe(BLANK_DIFFICULTY);
  });
  it('a single GW sums its fixture difficulties', () => {
    expect(gwTickerScore([3])).toBe(3);
  });
  it('a double GW sums both fixtures', () => {
    expect(gwTickerScore([2, 4])).toBe(6);
  });
  it('sums difficulties across a range, blanks as 5, doubles added', () => {
    // GW1: single (3), GW2: blank (5), GW3: double (2 + 4 = 6)
    expect(tickerScore([[3], [], [2, 4]])).toBe(3 + 5 + 6);
  });
});
