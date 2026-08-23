import { describe, it, expect } from 'vitest';
import {
  fdrMultiplier,
  perMatchBase,
  projectPlayerPoints,
  teamProjection,
  FDR_MULT_MIN,
  FDR_MULT_MAX,
} from '../src/index';

const available = { epNext: 5, epThis: 4, pointsPerGame: 4.5, form: 3, status: 'a' };

describe('fdrMultiplier', () => {
  it('is 1 at the neutral difficulty 3', () => {
    expect(fdrMultiplier(3)).toBeCloseTo(1);
  });
  it('scales up for easy fixtures and down for hard ones', () => {
    expect(fdrMultiplier(1)).toBeCloseTo(1.3);
    expect(fdrMultiplier(2)).toBeCloseTo(1.15);
    expect(fdrMultiplier(4)).toBeCloseTo(0.85);
    expect(fdrMultiplier(5)).toBeCloseTo(0.7);
  });
  it('stays within the clamp band at extremes', () => {
    expect(fdrMultiplier(-10)).toBe(FDR_MULT_MAX);
    expect(fdrMultiplier(20)).toBe(FDR_MULT_MIN);
  });
});

describe('perMatchBase', () => {
  it('takes the max of the per-match expectations', () => {
    expect(perMatchBase(available)).toBeCloseTo(5);
  });
  it('is 0 for injured, suspended, or unavailable players', () => {
    expect(perMatchBase({ ...available, status: 'i' })).toBe(0);
    expect(perMatchBase({ ...available, status: 's' })).toBe(0);
    expect(perMatchBase({ ...available, status: 'u' })).toBe(0);
  });
  it('halves the base for a doubtful player', () => {
    expect(perMatchBase({ ...available, status: 'd' })).toBeCloseTo(2.5);
  });
});

describe('projectPlayerPoints', () => {
  it('applies the neutral multiplier for a single average fixture', () => {
    expect(projectPlayerPoints(available, [{ difficulty: 3 }])).toBeCloseTo(5);
  });
  it('rewards an easy fixture and punishes a hard one', () => {
    expect(projectPlayerPoints(available, [{ difficulty: 1 }])).toBeCloseTo(6.5);
    expect(projectPlayerPoints(available, [{ difficulty: 5 }])).toBeCloseTo(3.5);
  });
  it('sums both fixtures of a double gameweek', () => {
    expect(projectPlayerPoints(available, [{ difficulty: 3 }, { difficulty: 3 }])).toBeCloseTo(10);
  });
  it('is 0 for a blank gameweek (no fixtures)', () => {
    expect(projectPlayerPoints(available, [])).toBe(0);
  });
  it('is 0 for an injured player even with a fixture', () => {
    expect(projectPlayerPoints({ ...available, status: 'i' }, [{ difficulty: 2 }])).toBe(0);
  });
  it('scales a doubtful player down', () => {
    expect(projectPlayerPoints({ ...available, status: 'd' }, [{ difficulty: 3 }])).toBeCloseTo(
      2.5
    );
  });
});

describe('teamProjection', () => {
  it('sums per-player projections', () => {
    expect(teamProjection([5, 4, 3])).toBeCloseTo(12);
  });
  it('applies per-player multipliers (e.g. a captain)', () => {
    expect(teamProjection([5, 4, 3], [2, 1, 1])).toBeCloseTo(17);
  });
});
