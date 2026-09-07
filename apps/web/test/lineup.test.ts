import { describe, expect, it } from 'vitest';
import { buildLineup, fillLineupSlots, projectedLineupTotal } from '../src/features/planner/lineup';
import type { DerivedGameweekPlayer } from '@fplq/shared';

const types = [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4];
const players: DerivedGameweekPlayer[] = types.map((elementType, i) => ({
  element: i + 1,
  elementType,
  team: i + 1,
  sellingPrice: 50,
  fixtures: [],
}));
const lineup = buildLineup(players, (id) => (id === 13 ? 10 : 2));

describe('planner projected score', () => {
  it('includes the captain only once on top of the XI total', () => {
    expect(lineup.captain).toBe(13);
    expect(projectedLineupTotal(lineup, null, 0)).toBe(40);
  });
  it('adds all four bench players on bench boost and retains captain doubling', () => {
    expect(projectedLineupTotal(lineup, 'bboost', 0)).toBe(48);
  });
  it('triples the captain, without counting the bench', () => {
    expect(projectedLineupTotal(lineup, '3xc', 0)).toBe(50);
  });
  it('subtracts hits and allows a negative projected net score', () => {
    expect(projectedLineupTotal(lineup, null, 8)).toBe(32);
    expect(
      projectedLineupTotal(
        buildLineup(players, () => 0),
        null,
        4
      )
    ).toBe(-4);
  });
  it('keeps a legal XI when the highest-scoring candidates are all defenders', () => {
    const result = buildLineup(players, (id) => (types[id - 1] === 2 ? 10 : 1));
    expect(result.xiElements).toHaveLength(11);
    expect(result.rows[2]).toHaveLength(5);
    expect(result.rows[3]!.length).toBeGreaterThanOrEqual(2);
    expect(result.rows[4]!.length).toBeGreaterThanOrEqual(1);
    expect(result.bench).toHaveLength(4);
  });
});

describe('transfer pitch slots', () => {
  it('keeps a higher-scoring replacement in the middle and restores the original order', () => {
    const reference = buildLineup(players, () => 2);
    const original = reference.rows[2]![1]!;
    const updated = players.map((p) => ({
      ...p,
      element: p.element === original.element ? 100 : p.element,
      proj: p.element === original.element ? 15 : 2,
    }));
    const result = fillLineupSlots(reference, updated, new Map([[original.element, 100]]));
    expect(result.rows[2]!.map((p) => p.element)).toEqual(
      reference.rows[2]!.map((p) => (p.element === original.element ? 100 : p.element))
    );
    const restored = fillLineupSlots(
      reference,
      players.map((p) => ({ ...p, proj: 2 })),
      new Map()
    );
    expect(restored.xiElements).toEqual(reference.xiElements);
  });
  it('retains bench slots even when a replacement has a higher projection than the XI', () => {
    const reference = buildLineup(players, () => 2);
    const original = reference.bench[1]!;
    const updated = players.map((p) => ({
      ...p,
      element: p.element === original.element ? 100 : p.element,
      proj: p.element === original.element ? 15 : 2,
    }));
    const result = fillLineupSlots(reference, updated, new Map([[original.element, 100]]));
    expect(result.bench[1]!.element).toBe(100);
    expect(result.xiElements).not.toContain(100);
  });
});
