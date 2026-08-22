import { describe, it, expect } from 'vitest';
import { projectAutoSubs } from '../src/index';
import type { AutoSubPick, PlayInfo, FixtureStateName } from '../src/index';
import { picks as realPicks, liveById } from './helpers';

// Build a play lookup where any element not listed is treated as a finished DNP.
function lookup(map: Record<number, PlayInfo>) {
  return (element: number): PlayInfo => map[element] ?? { minutes: 0, state: 'finished' };
}

const played = (minutes = 90, state: FixtureStateName = 'finished'): PlayInfo => ({
  minutes,
  state,
});
const dnp = (): PlayInfo => ({ minutes: 0, state: 'finished' });
const pending = (): PlayInfo => ({ minutes: 0, state: 'not_started' });

// 4-4-2 starters (pos 1..11), bench GK/DEF/MID/FWD (pos 12..15). Elements 101..115.
function squad(): AutoSubPick[] {
  const types = [1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 1, 2, 3, 4];
  return types.map((t, i) => ({
    element: 101 + i,
    position: i + 1,
    multiplier: i === 4 ? 2 : i < 11 ? 1 : 0,
    isCaptain: i === 4,
    isViceCaptain: i === 5,
    elementType: t,
  }));
}

describe('projectAutoSubs bench boost (rule 3.3)', () => {
  it('skips auto subs and plays all 15 for the real bench-boost entry', () => {
    const picks: AutoSubPick[] = realPicks.picks.map((p) => ({
      element: p.element,
      position: p.position,
      multiplier: p.multiplier,
      isCaptain: p.is_captain,
      isViceCaptain: p.is_vice_captain,
      elementType: p.element_type,
    }));
    const play = (element: number): PlayInfo => {
      const stats = liveById.get(element)?.stats;
      return { minutes: stats?.minutes ?? 0, state: 'live' };
    };
    const result = projectAutoSubs(picks, play, 'bboost');
    expect(result.subs).toEqual([]);
    expect(result.startingXi.length).toBe(15);
    // captain 426 played (39 min) so keeps the armband at x2
    expect(result.captain).toBe(426);
    expect(result.effectiveMultiplier.get(426)).toBe(2);
    // every pick has a multiplier of at least 1 under bench boost
    for (const p of picks)
      expect(result.effectiveMultiplier.get(p.element)).toBeGreaterThanOrEqual(1);
  });
});

describe('projectAutoSubs GK (rule 3.3)', () => {
  it('swaps the bench GK in when the starting GK did not play', () => {
    const play = lookup({
      101: dnp(),
      112: played(),
      // rest of XI played so no outfield subs
      102: played(),
      103: played(),
      104: played(),
      105: played(),
      106: played(),
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    });
    const result = projectAutoSubs(squad(), play, null);
    expect(result.subs).toContainEqual({ in: 112, out: 101 });
    expect(result.effectiveMultiplier.get(112)).toBe(1);
    expect(result.effectiveMultiplier.get(101)).toBe(0);
  });

  it('does not swap the GK when the bench GK also did not play', () => {
    const play = lookup({
      101: dnp(),
      112: dnp(),
      102: played(),
      103: played(),
      104: played(),
      105: played(),
      106: played(),
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    });
    const result = projectAutoSubs(squad(), play, null);
    expect(result.subs).toEqual([]);
  });
});

describe('projectAutoSubs outfield (rule 3.3)', () => {
  it('brings in the first eligible bench player for a starter who did not play', () => {
    const play = lookup({
      101: played(),
      102: dnp(),
      113: played(),
      103: played(),
      104: played(),
      105: played(),
      106: played(),
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
      112: dnp(),
      114: pending(),
      115: pending(),
    });
    const result = projectAutoSubs(squad(), play, null);
    expect(result.subs).toEqual([{ in: 113, out: 102 }]);
    expect(result.startingXi).toContain(113);
    expect(result.startingXi).not.toContain(102);
  });

  it('skips a bench player whose entry would make the XI invalid', () => {
    // 3-4-3 starters; only a defender did not play; bench FWD/MID cannot legally
    // replace a defender (would drop below 3 DEF), only the bench DEF can.
    const types = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 4, 3, 2];
    const picks: AutoSubPick[] = types.map((t, i) => ({
      element: 201 + i,
      position: i + 1,
      multiplier: i < 11 ? 1 : 0,
      isCaptain: i === 8,
      isViceCaptain: i === 9,
      elementType: t,
    }));
    const play = lookup({
      201: played(),
      202: played(),
      203: played(),
      204: dnp(), // defender out
      205: played(),
      206: played(),
      207: played(),
      208: played(),
      209: played(),
      210: played(),
      211: played(),
      212: dnp(),
      213: played(),
      214: played(),
      215: played(), // bench FWD, MID, DEF all played
    });
    const result = projectAutoSubs(picks, play, null);
    // bench DEF (215) is the only legal replacement for the DNP defender (204)
    expect(result.subs).toEqual([{ in: 215, out: 204 }]);
  });
});

describe('projectAutoSubs captain (rule 3.4)', () => {
  const allPlay = () =>
    lookup({
      101: played(),
      102: played(),
      103: played(),
      104: played(),
      105: played(),
      106: played(),
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    });

  it('keeps the captain when they played', () => {
    const result = projectAutoSubs(squad(), allPlay(), null);
    expect(result.captain).toBe(105);
    expect(result.effectiveMultiplier.get(105)).toBe(2);
  });

  it('gives the armband to the vice when the captain did not play', () => {
    const map: Record<number, PlayInfo> = {
      101: played(),
      102: played(),
      103: played(),
      104: played(),
      105: dnp(), // captain out
      106: played(), // vice played
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    };
    const result = projectAutoSubs(squad(), lookup(map), null);
    expect(result.captain).toBe(106);
    expect(result.effectiveMultiplier.get(106)).toBe(2);
  });

  it('triples the captain multiplier with the 3xc chip', () => {
    const result = projectAutoSubs(squad(), allPlay(), '3xc');
    expect(result.effectiveMultiplier.get(105)).toBe(3);
  });

  it('assigns nobody when captain and vice both did not play', () => {
    const map: Record<number, PlayInfo> = {
      101: played(),
      102: played(),
      103: played(),
      104: played(),
      105: dnp(),
      106: dnp(),
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    };
    const result = projectAutoSubs(squad(), lookup(map), null);
    expect(result.captain).toBeNull();
  });

  it('gives the armband to the vice when the captain is out and the vice has not kicked off yet', () => {
    const map: Record<number, PlayInfo> = {
      101: played(),
      102: played(),
      103: played(),
      104: played(),
      105: dnp(),
      106: pending(), // vice fixture not finished -> eligible
      107: played(),
      108: played(),
      109: played(),
      110: played(),
      111: played(),
    };
    const result = projectAutoSubs(squad(), lookup(map), null);
    expect(result.captain).toBe(106);
  });
});
