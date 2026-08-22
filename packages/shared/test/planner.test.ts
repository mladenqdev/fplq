import { describe, it, expect } from 'vitest';
import {
  emptyPlan,
  addTransfer,
  removeTransfer,
  setChip,
  derivePlan,
  type PlannerContext,
} from '../src/index';

interface Meta {
  type: number;
  team: number;
  now: number;
  sell: number;
}

const meta = new Map<number, Meta>();
function set(id: number, type: number, team: number, now: number, sell = now) {
  meta.set(id, { type, team, now, sell });
}
// Starting squad 1..15: 2 GKP, 5 DEF, 5 MID, 3 FWD, no team over 3.
set(1, 1, 10, 50);
set(2, 1, 11, 50);
set(3, 2, 1, 50);
set(4, 2, 1, 50);
set(5, 2, 1, 50);
set(6, 2, 2, 50);
set(7, 2, 2, 50);
set(8, 3, 3, 50);
set(9, 3, 3, 50);
set(10, 3, 3, 50);
set(11, 3, 4, 50);
set(12, 3, 4, 50);
set(13, 4, 5, 50);
set(14, 4, 5, 50);
set(15, 4, 5, 50);
// buy targets
set(100, 2, 6, 45); // clean DEF replacement
set(201, 3, 1, 50); // MID from team 1 -> triggers team limit
set(300, 4, 7, 999); // very expensive -> negative bank

const START = Array.from({ length: 15 }, (_, i) => i + 1);

function buildCtx(over: Partial<PlannerContext> = {}): PlannerContext {
  return {
    startingSquad: START,
    bank: 0,
    freeTransfersAtStart: 1,
    sellingPriceOf: (el) => meta.get(el)!.sell,
    nowCostOf: (el) => meta.get(el)!.now,
    elementTypeOf: (el) => meta.get(el)!.type,
    teamOf: (el) => meta.get(el)!.team,
    fixturesFor: () => [],
    isChipAvailable: () => true,
    ...over,
  };
}

describe('plan mutations (pure, immutable)', () => {
  it('emptyPlan creates the horizon of gameweeks after the base event', () => {
    const plan = emptyPlan(99, 3, 5, '2026-01-01T00:00:00Z');
    expect(
      Object.keys(plan.gameweeks)
        .map(Number)
        .sort((a, b) => a - b)
    ).toEqual([4, 5, 6, 7, 8]);
    expect(plan.gameweeks[4]).toEqual({ transfers: [], chip: null });
  });

  it('addTransfer and setChip return new plans without mutating the original', () => {
    const base = emptyPlan(1, 1, 5, 't0');
    const withTransfer = addTransfer(base, 2, { out: 3, in: 100 }, 't1');
    expect(base.gameweeks[2]!.transfers).toHaveLength(0);
    expect(withTransfer.gameweeks[2]!.transfers).toEqual([{ out: 3, in: 100 }]);
    expect(withTransfer.updatedAt).toBe('t1');

    const withChip = setChip(withTransfer, 2, 'wildcard', 't2');
    expect(withTransfer.gameweeks[2]!.chip).toBeNull();
    expect(withChip.gameweeks[2]!.chip).toBe('wildcard');
  });

  it('removeTransfer drops the transfer at the given index', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = addTransfer(plan, 2, { out: 3, in: 100 });
    plan = addTransfer(plan, 2, { out: 4, in: 201 });
    plan = removeTransfer(plan, 2, 0);
    expect(plan.gameweeks[2]!.transfers).toEqual([{ out: 4, in: 201 }]);
  });
});

describe('derivePlan (rule 3.8)', () => {
  it('with no transfers the squad holds and free transfers bank up to the cap', () => {
    const plan = emptyPlan(1, 1, 5, 't0');
    const derived = derivePlan(plan, buildCtx());
    expect(derived.gameweeks.map((g) => g.event)).toEqual([2, 3, 4, 5, 6]);
    expect(derived.gameweeks.map((g) => g.freeTransfers)).toEqual([1, 2, 3, 4, 5]);
    for (const gw of derived.gameweeks) {
      expect(gw.hitCost).toBe(0);
      expect(gw.problems).toEqual([]);
      expect(gw.squad).toHaveLength(15);
    }
  });

  it('a clean transfer updates bank and keeps the squad valid', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = addTransfer(plan, 2, { out: 3, in: 100 });
    const gw2 = derivePlan(plan, buildCtx()).gameweeks[0]!;
    expect(gw2.transfersMade).toBe(1);
    expect(gw2.hitCost).toBe(0);
    expect(gw2.bank).toBe(5); // sold at 50, bought at 45
    expect(gw2.squad).toContain(100);
    expect(gw2.squad).not.toContain(3);
    expect(gw2.problems).toEqual([]);
  });

  it('charges a 4-point hit for a transfer beyond the free ones', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = addTransfer(plan, 2, { out: 3, in: 100 });
    plan = addTransfer(plan, 2, { out: 6, in: 201 });
    const derived = derivePlan(plan, buildCtx());
    expect(derived.gameweeks[0]!.hitCost).toBe(4); // 2 made, 1 free
    expect(derived.gameweeks[1]!.freeTransfers).toBe(1); // both free transfers spent
  });

  it('a wildcard makes transfers free and does not consume the free transfer', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = setChip(plan, 2, 'wildcard');
    plan = addTransfer(plan, 2, { out: 3, in: 100 });
    plan = addTransfer(plan, 2, { out: 6, in: 201 });
    const derived = derivePlan(plan, buildCtx());
    expect(derived.gameweeks[0]!.hitCost).toBe(0);
    expect(derived.gameweeks[1]!.freeTransfers).toBe(2); // 1 banked +1
    expect(derived.gameweeks[1]!.squad).toContain(100); // wildcard changes persist
  });

  it('a free hit fields a one-off squad and reverts the next GW', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = setChip(plan, 2, 'freehit');
    plan = addTransfer(plan, 2, { out: 3, in: 100 });
    const derived = derivePlan(plan, buildCtx());
    expect(derived.gameweeks[0]!.squad).toContain(100);
    expect(derived.gameweeks[0]!.squad).not.toContain(3);
    expect(derived.gameweeks[0]!.hitCost).toBe(0);
    // reverted in GW3
    expect(derived.gameweeks[1]!.squad).toContain(3);
    expect(derived.gameweeks[1]!.squad).not.toContain(100);
  });

  it('flags more than three players from one club', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = addTransfer(plan, 2, { out: 8, in: 201 }); // MID for MID, both team 1 now has 4
    const gw2 = derivePlan(plan, buildCtx()).gameweeks[0]!;
    expect(gw2.problems.some((p) => p.includes('More than 3'))).toBe(true);
  });

  it('flags a negative bank', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = addTransfer(plan, 2, { out: 3, in: 300 }); // DEF for a very expensive FWD
    const gw2 = derivePlan(plan, buildCtx()).gameweeks[0]!;
    expect(gw2.bank).toBeLessThan(0);
    expect(gw2.problems).toContain('Negative bank');
    // position counts also break (DEF 4, FWD 4)
    expect(gw2.problems.some((p) => p.includes('DEF'))).toBe(true);
  });

  it('flags a chip that is unavailable in that GW', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = setChip(plan, 2, 'wildcard');
    const ctx = buildCtx({ isChipAvailable: (chip) => chip !== 'wildcard' });
    const gw2 = derivePlan(plan, ctx).gameweeks[0]!;
    expect(gw2.problems.some((p) => p.includes('not available'))).toBe(true);
  });

  it('flags a chip used more than once across the plan', () => {
    let plan = emptyPlan(1, 1, 5, 't0');
    plan = setChip(plan, 2, 'bboost');
    plan = setChip(plan, 3, 'bboost');
    const derived = derivePlan(plan, buildCtx());
    expect(derived.gameweeks[1]!.problems.some((p) => p.includes('more than once'))).toBe(true);
  });
});
