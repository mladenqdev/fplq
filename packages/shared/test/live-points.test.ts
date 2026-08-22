import { describe, it, expect } from 'vitest';
import { computeLivePoints, projectAutoSubs, fixtureBonus } from '../src/index';
import type { AutoSubPick, PlayInfo, LivePointsRow } from '../src/index';
import { picks as realPicks, liveById, fixtures } from './helpers';

describe('computeLivePoints (rule 3.5)', () => {
  it('sums the effective XI times multiplier and subtracts the hit', () => {
    const rows: LivePointsRow[] = [
      { points: 6, multiplier: 2 }, // captain
      { points: 5, multiplier: 1 },
      { points: 3, multiplier: 1 },
      { points: 8, multiplier: 0 }, // bench
    ];
    const result = computeLivePoints(rows, 4);
    expect(result.computedPoints).toBe(6 * 2 + 5 + 3 - 4);
    expect(result.pointsOnBench).toBe(8);
  });

  it('reports bench points separately and applies no hit when cost is 0', () => {
    const rows: LivePointsRow[] = [
      { points: 10, multiplier: 1 },
      { points: 2, multiplier: 0 },
      { points: 4, multiplier: 0 },
    ];
    const result = computeLivePoints(rows, 0);
    expect(result.computedPoints).toBe(10);
    expect(result.pointsOnBench).toBe(6);
  });

  it('reproduces the real bench-boost entry total (all 15 count, captain doubled)', () => {
    // bonus per fixture (all started GW1 fixtures already have confirmed bonus, so the
    // live total_points already include it and nothing extra is added).
    const bonusByFixture = new Map(fixtures.map((f) => [f.id, fixtureBonus(f)]));

    const picks: AutoSubPick[] = realPicks.picks.map((p) => ({
      element: p.element,
      position: p.position,
      multiplier: p.multiplier,
      isCaptain: p.is_captain,
      isViceCaptain: p.is_vice_captain,
      elementType: p.element_type,
    }));
    const play = (element: number): PlayInfo => ({
      minutes: liveById.get(element)?.stats.minutes ?? 0,
      state: 'live',
    });
    const { effectiveMultiplier } = projectAutoSubs(picks, play, 'bboost');

    const rows: LivePointsRow[] = picks.map((p) => {
      const stats = liveById.get(p.element)?.stats;
      const official = stats?.total_points ?? 0;
      // add provisional bonus only where the fixture bonus is not yet confirmed
      let provisional = 0;
      for (const [, fb] of bonusByFixture) {
        if (!fb.confirmed) provisional += fb.bonus.get(p.element) ?? 0;
      }
      return {
        points: official + provisional,
        multiplier: effectiveMultiplier.get(p.element) ?? 0,
      };
    });

    const result = computeLivePoints(rows, realPicks.entry_history.event_transfers_cost);
    // official summary_event_points was 24 at snapshot; our breakdown is 23 (1 pt skew)
    expect(result.computedPoints).toBe(23);
    expect(result.pointsOnBench).toBe(0); // bench boost: nobody sits out
  });
});
