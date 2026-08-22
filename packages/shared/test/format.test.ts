import { describe, it, expect } from 'vitest';
import { formatPrice, formatRank, formatRankCompact } from '../src/index';

describe('formatPrice', () => {
  it('renders tenths of a million with one decimal', () => {
    expect(formatPrice(120)).toBe('12.0');
    expect(formatPrice(45)).toBe('4.5');
    expect(formatPrice(1000)).toBe('100.0');
    expect(formatPrice(0)).toBe('0.0');
  });
});

describe('formatRank', () => {
  it('groups thousands with commas', () => {
    expect(formatRank(794510)).toBe('794,510');
    expect(formatRank(1000)).toBe('1,000');
    expect(formatRank(999)).toBe('999');
    expect(formatRank(8906129)).toBe('8,906,129');
  });
});

describe('formatRankCompact', () => {
  it('keeps small numbers as-is', () => {
    expect(formatRankCompact(999)).toBe('999');
  });
  it('rounds thousands to k', () => {
    expect(formatRankCompact(794510)).toBe('795k');
    expect(formatRankCompact(50000)).toBe('50k');
  });
  it('renders millions with one decimal', () => {
    expect(formatRankCompact(1250000)).toBe('1.3m');
    expect(formatRankCompact(1000000)).toBe('1.0m');
  });
});
