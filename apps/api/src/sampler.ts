// Node rank sampler: tracked entries (config + entries whose live route was hit in the
// last 24h, capped at 50). Samples every 60s while live, every 15min idle. Reuses the
// cached entry fetch and never throws out of the timer. See ARCHITECTURE.md section 4.
// On Workers this loop is replaced by a Cron Trigger (worker.ts) that calls the same
// sampleTrackedEntriesOnce routine.

import type { AppContext } from './context';
import { sampleTrackedEntriesOnce } from './sample';

const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_INTERVAL_MS = 60 * 1000;
const IDLE_INTERVAL_MS = 15 * 60 * 1000;
const MAX_TRACKED = 50;

// The bit of the sampler the routes depend on: recording that an entry's live route
// was requested. Workers passes a no-op since its scheduled pass samples config only.
export interface LiveRequestSink {
  noteLiveRequest(entryId: number): void;
}

export class Sampler implements LiveRequestSink {
  private readonly requested = new Map<number, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ctx: AppContext) {}

  noteLiveRequest(entryId: number): void {
    this.requested.set(entryId, Date.now());
  }

  trackedEntries(): number[] {
    const cutoff = Date.now() - DAY_MS;
    const recent = [...this.requested].filter(([, t]) => t >= cutoff).map(([id]) => id);
    return [...new Set([...this.ctx.trackedEntries, ...recent])].slice(0, MAX_TRACKED);
  }

  start(): void {
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleNext(): void {
    const interval = this.ctx.liveness.isLive() ? LIVE_INTERVAL_MS : IDLE_INTERVAL_MS;
    this.timer = setTimeout(() => {
      void this.runTick();
    }, interval);
  }

  private async runTick(): Promise<void> {
    try {
      await this.sampleNow();
    } catch {
      // never throw out of the timer
    } finally {
      this.scheduleNext();
    }
  }

  // One sampling pass; also exposed for tests and startup verification.
  sampleNow(): Promise<number> {
    return sampleTrackedEntriesOnce(this.ctx, this.trackedEntries());
  }
}
