import { describe, expect, it } from 'vitest';
import { emptyPlan, type ElementDto, type PlannerContext, type RecentMatch } from '@fplq/shared';
import {
  playerEvidence,
  estimateFixture,
  recommendTransfers,
} from '../src/features/planner/transfer-recommendations';

const matches = (minutes: number[]): RecentMatch[] =>
  minutes.map((m, i) => ({ fixture: i + 1, event: i + 1, minutes: m, defconPoints: 0 }));
const player = (id: number, elementType: number, overrides: Partial<ElementDto> = {}): ElementDto =>
  ({
    id,
    elementType,
    team: id,
    webName: `P${id}`,
    nowCost: 50,
    minutes: 540,
    xg: 0.6,
    xa: 0.6,
    xgc: 8.4,
    bonus: 0,
    saves: 0,
    yellowCards: 0,
    status: 'a',
    chanceOfPlayingNextRound: null,
    form: 4,
    epNext: 4,
    epThis: 4,
    ...overrides,
  }) as ElementDto;

function scenario(extra: Partial<ElementDto> = {}) {
  const types = [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4];
  const elements = types.map((t, i) => player(i + 1, t));
  elements.push(player(16, 3, { xg: 8, xa: 4, ...extra }));
  const lookup = (id: number) => elements.find((p) => p.id === id)!;
  const ctx: PlannerContext = {
    startingSquad: types.map((_, i) => i + 1),
    bank: 0,
    freeTransfersAtStart: 3,
    sellingPriceOf: () => 50,
    nowCostOf: (id) => lookup(id).nowCost,
    elementTypeOf: (id) => lookup(id).elementType,
    teamOf: (id) => lookup(id).team,
    fixturesFor: (_, event) => [{ id: event, opponent: 20, isHome: true, difficulty: 3 }],
    isChipAvailable: () => true,
  };
  return {
    elements,
    ctx,
    plan: emptyPlan(1, 6),
    event: 7,
    horizon: 3,
    recent: {
      throughEvent: 6,
      players: Object.fromEntries(elements.map((p) => [p.id, matches([90, 90, 90, 90, 90, 90])])),
    },
  };
}

describe('transfer evidence', () => {
  it('penalizes recent DNPs and does not promote a cameo despite huge form', () => {
    const p = player(1, 3, { form: 20, epNext: 20, xg: 1, minutes: 30 });
    const evidence = playerEvidence(p, matches([0, 0, 30]), [p]);
    expect(evidence.minutes).toBe(15);
    expect(evidence.reliable).toBe(false);
    expect(estimateFixture(p, evidence, 3, true)).toBeLessThan(3);
  });
  it('uses actual DC returns rather than dividing total defensive actions by the threshold', () => {
    const p = player(1, 2);
    const evidence = playerEvidence(
      p,
      matches([90, 90, 90]).map((m, i) => ({ ...m, defconPoints: i === 2 ? 2 : 0 })),
      [p]
    );
    expect(evidence.dcHits).toBe(1);
    expect(evidence.dcPoints).toBe(0.4);
  });
  it('responds to opponent difficulty and next-round availability', () => {
    const p = player(1, 3, { status: 'i', chanceOfPlayingNextRound: 0 });
    const evidence = playerEvidence(p, matches([90, 90, 90]), [p]);
    expect(estimateFixture(p, evidence, 2, true)).toBe(0);
    expect(estimateFixture(p, evidence, 2, false)).toBeGreaterThan(
      estimateFixture(p, evidence, 5, false)
    );
  });
});

describe('transfer decisions', () => {
  it('finds a sustained starting-XI upgrade and deducts the additional hit', () => {
    const setup = scenario();
    const free = recommendTransfers(setup).ideas[0]!;
    expect(free.incoming.id).toBe(16);
    const paid = recommendTransfers({ ...setup, ctx: { ...setup.ctx, freeTransfersAtStart: 0 } })
      .ideas[0]!;
    expect(paid.hit).toBe(4);
    expect(free.gain - paid.gain).toBeCloseTo(4);
  });
  it('does not recommend an explosive substitute or an unavailable signing', () => {
    const setup = scenario({ minutes: 100, form: 99, epNext: 99 });
    setup.recent.players[16] = matches([0, 10, 90]);
    expect(recommendTransfers(setup).ideas).toHaveLength(0);
    expect(
      recommendTransfers(scenario({ status: 'd', chanceOfPlayingNextRound: 75 })).ideas
    ).toHaveLength(0);
  });
  it('respects budget and future transfer conflicts', () => {
    expect(recommendTransfers(scenario({ nowCost: 51 })).ideas).toHaveLength(0);
    const setup = scenario();
    setup.plan.gameweeks[8]!.transfers = [{ out: 8, in: 16 }];
    expect(recommendTransfers(setup).ideas).toHaveLength(0);
  });
  it('holds when the apparent improvement is only on the bench', () => {
    const setup = scenario({ elementType: 1, xg: 0, xa: 0, xgc: 2 });
    setup.elements[0] = player(1, 1, { xgc: 0, xg: 1 });
    // Keeper 1 still starts; upgrading keeper 2 earns no additional XI points.
    expect(recommendTransfers(setup).ideas).toHaveLength(0);
  });
  it('does not fill a quota with marginal swaps or missing evidence', () => {
    expect(recommendTransfers(scenario({ xg: 0.61, xa: 0.6 })).ideas).toHaveLength(0);
    expect(
      recommendTransfers({ ...scenario(), recent: { throughEvent: null, players: {} } }).ideas
    ).toHaveLength(0);
  });
  it('counts blank and double weeks and pauses chip-wide advice', () => {
    const setup = scenario();
    const original = setup.ctx.fixturesFor;
    setup.ctx.fixturesFor = (team, event) => (team === 16 ? [] : original(team, event));
    expect(recommendTransfers(setup).ideas).toHaveLength(0);
    setup.ctx.fixturesFor = (team, event) =>
      team === 16 ? [...original(team, event), ...original(team, event)] : original(team, event);
    expect(recommendTransfers(setup).ideas[0]!.fixtures[0]!.incoming).toHaveLength(2);
    setup.plan.gameweeks[7]!.chip = 'freehit';
    expect(recommendTransfers(setup).reason).toContain('Free Hit');
  });
});
