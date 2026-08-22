import { describe, it, expect } from 'vitest';
import { bonusFromBps, fixtureBonus } from '../src/index';
import { fixtureById } from './helpers';

describe('bonusFromBps (rule 3.1, standard competition ranking)', () => {
  it('awards 3/2/1 to the top three distinct bps', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 41 },
      { element: 2, value: 37 },
      { element: 3, value: 36 },
      { element: 4, value: 34 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.get(2)).toBe(2);
    expect(bonus.get(3)).toBe(1);
    expect(bonus.has(4)).toBe(false);
  });

  it('tie for first: 3, 3, 1', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 40 },
      { element: 2, value: 40 },
      { element: 3, value: 30 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.get(2)).toBe(3);
    expect(bonus.get(3)).toBe(1);
  });

  it('tie for second: 3, 2, 2', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 40 },
      { element: 2, value: 30 },
      { element: 3, value: 30 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.get(2)).toBe(2);
    expect(bonus.get(3)).toBe(2);
  });

  it('tie for third: 3, 2, 1, 1', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 40 },
      { element: 2, value: 35 },
      { element: 3, value: 30 },
      { element: 4, value: 30 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.get(2)).toBe(2);
    expect(bonus.get(3)).toBe(1);
    expect(bonus.get(4)).toBe(1);
  });

  it('triple tie for first: 3, 3, 3 (nobody gets rank 2 or 3)', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 20 },
      { element: 2, value: 20 },
      { element: 3, value: 20 },
      { element: 4, value: 10 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.get(2)).toBe(3);
    expect(bonus.get(3)).toBe(3);
    expect(bonus.has(4)).toBe(false);
  });

  it('ignores players with bps <= 0', () => {
    const bonus = bonusFromBps([
      { element: 1, value: 5 },
      { element: 2, value: 0 },
      { element: 3, value: -8 },
    ]);
    expect(bonus.get(1)).toBe(3);
    expect(bonus.has(2)).toBe(false);
    expect(bonus.has(3)).toBe(false);
  });

  it('empty input yields no bonus', () => {
    expect(bonusFromBps([]).size).toBe(0);
  });
});

describe('fixtureBonus', () => {
  it('uses official bonus when the bonus stat is present (confirmed)', () => {
    const result = fixtureBonus(fixtureById.get(1)!);
    expect(result.confirmed).toBe(true);
    expect(result.bonus.get(15)).toBe(3);
    expect(result.bonus.get(10)).toBe(2);
    expect(result.bonus.get(12)).toBe(1);
  });

  it('projects provisional bonus from bps when the bonus stat is empty but started', () => {
    const fixture = structuredClone(fixtureById.get(1)!);
    // clear the confirmed bonus so the provisional path runs
    fixture.stats = fixture.stats.filter((s) => s.identifier !== 'bonus');
    const result = fixtureBonus(fixture);
    expect(result.confirmed).toBe(false);
    // top three home bps in fixture 1 are element 15 (41), 10 (37), 12 (36)
    expect(result.bonus.get(15)).toBe(3);
    expect(result.bonus.get(10)).toBe(2);
    expect(result.bonus.get(12)).toBe(1);
  });

  it('returns nothing for a fixture that has not started', () => {
    const result = fixtureBonus(fixtureById.get(3)!);
    expect(result.confirmed).toBe(false);
    expect(result.bonus.size).toBe(0);
  });
});
