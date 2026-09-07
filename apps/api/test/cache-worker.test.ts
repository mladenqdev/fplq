import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FplBootstrap, FplEntry, FplFixture } from '@fplq/shared';
import { TtlCache } from '../src/cache';
import { AppContext } from '../src/context';
import { fpl } from '../src/fplClient';
import { buildContext, runScheduledSample, type Env } from '../src/worker';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function upstream(live: boolean) {
  vi.spyOn(fpl, 'bootstrap').mockResolvedValue({
    events: [{ id: 3, is_current: true }],
  } as FplBootstrap);
  vi.spyOn(fpl, 'fixtures').mockResolvedValue([
    { event: 3, started: live, finished: false },
  ] as FplFixture[]);
  vi.spyOn(fpl, 'entry').mockResolvedValue({
    current_event: 3,
    summary_overall_rank: 184021,
    summary_overall_points: 234,
    summary_event_points: 51,
    summary_event_rank: 5284446,
  } as FplEntry);
}

describe('Worker sampling and caching', () => {
  it('samples an ongoing match on a non-quarter-hour minute, even from a cold context', async () => {
    upstream(true);
    const store = { append: vi.fn(), list: vi.fn() };
    const ctx = new AppContext([1965441], store);
    expect(ctx.liveness.isLive()).toBe(false);
    await runScheduledSample(ctx, Date.parse('2026-09-05T15:07:00Z'));
    expect(ctx.liveness.isLive()).toBe(true);
    expect(store.append).toHaveBeenCalledWith(
      expect.objectContaining({ entry: 1965441, event: 3, overallRank: 184021 })
    );
  });

  it('keeps idle sampling on quarter hours', async () => {
    upstream(false);
    const store = { append: vi.fn(), list: vi.fn() };
    const ctx = new AppContext([1965441], store);
    await runScheduledSample(ctx, Date.parse('2026-09-05T15:07:00Z'));
    expect(store.append).not.toHaveBeenCalled();
    await runScheduledSample(ctx, Date.parse('2026-09-05T15:15:00Z'));
    expect(store.append).toHaveBeenCalledOnce();
  });

  it('detects kickoff when cached fixtures refresh within a minute', async () => {
    vi.useFakeTimers();
    upstream(false);
    const ctx = new AppContext([], { append: vi.fn(), list: vi.fn() });
    await Promise.all([ctx.getBootstrap(), ctx.getFixtures()]);
    expect(ctx.liveness.isLive()).toBe(false);
    vi.mocked(fpl.fixtures).mockResolvedValue([
      { event: 3, started: true, finished: false },
    ] as FplFixture[]);
    vi.advanceTimersByTime(60_000);
    await ctx.getFixtures();
    expect(ctx.liveness.isLive()).toBe(true);
  });

  it('reuses cached data across Worker requests and resets on binding/config changes', async () => {
    upstream(false);
    const env = { DB: {}, FPLQ_TRACKED_ENTRIES: '1965441' } as Env;
    const first = buildContext(env);
    await first.getBootstrap();
    const second = buildContext({ ...env });
    await second.getBootstrap();
    expect(second).toBe(first);
    expect(fpl.bootstrap).toHaveBeenCalledOnce();
    expect(buildContext({ ...env, FPLQ_TRACKED_ENTRIES: '42' })).not.toBe(first);
    expect(buildContext({ ...env, DB: {} } as Env)).not.toBe(first);
  });

  it('serves the last good value to every concurrent caller when refresh fails', async () => {
    vi.useFakeTimers();
    const cache = new TtlCache();
    const ttl = { live: 100, idle: 100 };
    const original = await cache.get('entry', ttl, async () => ({ rank: 10 }));
    vi.advanceTimersByTime(101);
    const fail = vi.fn(async () => {
      throw new Error('FPL unavailable');
    });
    const results = await Promise.all([
      cache.get('entry', ttl, fail),
      cache.get('entry', ttl, fail),
    ]);
    expect(results).toEqual([original, original]);
    expect(fail).toHaveBeenCalledOnce();
  });
});
