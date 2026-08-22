// Rule 3.1: provisional bonus.
// Rank players by bps descending using standard competition ranking (1, 1, 3 on a
// tie for first). rank 1 -> 3, rank 2 -> 2, rank 3 -> 1, else 0. Only bps > 0 count.

import type { FplFixture, FplFixtureStatEntry } from './fpl-types';

export interface BpsEntry {
  element: number;
  value: number;
}

export function bonusFromBps(bps: BpsEntry[]): Map<number, number> {
  const eligible = bps.filter((b) => b.value > 0);
  const result = new Map<number, number>();
  for (const entry of eligible) {
    const rank = 1 + eligible.filter((other) => other.value > entry.value).length;
    const points = rank === 1 ? 3 : rank === 2 ? 2 : rank === 3 ? 1 : 0;
    if (points > 0) {
      result.set(entry.element, (result.get(entry.element) ?? 0) + points);
    }
  }
  return result;
}

function combinedStat(fixture: FplFixture, identifier: string): FplFixtureStatEntry[] {
  const stat = fixture.stats.find((s) => s.identifier === identifier);
  if (!stat) return [];
  return [...stat.h, ...stat.a];
}

export interface FixtureBonus {
  bonus: Map<number, number>;
  confirmed: boolean;
}

// Effective bonus for a fixture: official values when the `bonus` stat is present,
// otherwise the provisional projection from bps once the fixture has started (rule 3.1).
export function fixtureBonus(fixture: FplFixture): FixtureBonus {
  const official = combinedStat(fixture, 'bonus');
  if (official.length > 0) {
    const bonus = new Map<number, number>();
    for (const entry of official) bonus.set(entry.element, entry.value);
    return { bonus, confirmed: true };
  }
  if (!fixture.started) return { bonus: new Map(), confirmed: false };
  return { bonus: bonusFromBps(combinedStat(fixture, 'bps')), confirmed: false };
}
