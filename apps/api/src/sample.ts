// The core "sample tracked entries once" routine, shared by the Node sampler
// (setInterval loop in sampler.ts) and the Workers scheduled handler (worker.ts).
// One pass: warm bootstrap+fixtures so the liveness signal stays accurate, then write
// one rank row per entry (the store skips unchanged consecutive samples). Never throws
// per entry; returns how many rows it attempted to append.

import type { FplBootstrap } from '@fplq/shared';
import type { AppContext } from './context';
import { currentEventId } from './mappers/bootstrap';

export async function sampleTrackedEntriesOnce(
  ctx: AppContext,
  entryIds: number[]
): Promise<number> {
  await Promise.allSettled([ctx.getBootstrap(), ctx.getFixtures()]);
  const bootstrap = ctx.cache.peek<FplBootstrap>('bootstrap');
  const currentEvent = bootstrap ? currentEventId(bootstrap) : null;

  let written = 0;
  for (const entryId of entryIds) {
    try {
      const entry = await ctx.getEntry(entryId);
      const event = currentEvent ?? entry.value.current_event;
      if (event === null) continue;
      await ctx.rankStore.append({
        entry: entryId,
        event,
        t: new Date().toISOString(),
        overallRank: entry.value.summary_overall_rank,
        overallPoints: entry.value.summary_overall_points,
        eventPoints: entry.value.summary_event_points,
        eventRank: entry.value.summary_event_rank,
      });
      written += 1;
    } catch {
      // skip this entry on failure
    }
  }
  return written;
}
