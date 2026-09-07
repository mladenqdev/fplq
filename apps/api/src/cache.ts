// In-memory TTL cache with stale-while-error, and the `liveness` signal that selects
// live vs idle TTLs. See ARCHITECTURE.md section 4.

import type { FplFixture } from '@fplq/shared';

export interface Ttl {
  live: number;
  idle: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

// TTLs per upstream resource: { while live, otherwise }.
export const TTL = {
  bootstrap: { live: 2 * MINUTE, idle: 10 * MINUTE },
  fixtures: { live: MINUTE, idle: MINUTE },
  fixturesByEvent: { live: 45 * SECOND, idle: 10 * MINUTE },
  live: { live: 45 * SECOND, idle: 10 * MINUTE },
  eventStatus: { live: 60 * SECOND, idle: 10 * MINUTE },
  entry: { live: 30 * SECOND, idle: 5 * MINUTE },
  history: { live: 2 * MINUTE, idle: 10 * MINUTE },
  picks: { live: 60 * SECOND, idle: 10 * MINUTE },
  transfers: { live: 2 * MINUTE, idle: 10 * MINUTE },
  entryLive: { live: 30 * SECOND, idle: 5 * MINUTE },
  squad: { live: 60 * SECOND, idle: 5 * MINUTE },
  ladder: { live: 2 * MINUTE, idle: 15 * MINUTE },
  league: { live: 60 * SECOND, idle: 10 * MINUTE },
  element: { live: 10 * MINUTE, idle: 10 * MINUTE },
} as const satisfies Record<string, Ttl>;

interface Stored {
  value: unknown;
  storedAt: number;
  fetchedAt: string;
}

export interface Cached<T> {
  value: T;
  fetchedAt: string;
}

export class TtlCache {
  private store = new Map<string, Stored>();
  private loading = new Map<string, Promise<Stored>>();

  // Set by the app so the cache can pick the live or idle TTL.
  isLive: () => boolean = () => false;

  peek<T>(key: string): T | undefined {
    return this.store.get(key)?.value as T | undefined;
  }

  async get<T>(key: string, ttl: Ttl, loader: () => Promise<T>): Promise<Cached<T>> {
    const now = Date.now();
    const ttlMs = this.isLive() ? ttl.live : ttl.idle;
    const current = this.store.get(key);
    if (current && now - current.storedAt < ttlMs) {
      return { value: current.value as T, fetchedAt: current.fetchedAt };
    }

    const pending = this.loading.get(key);
    if (pending) {
      try {
        const stored = await pending;
        return { value: stored.value as T, fetchedAt: stored.fetchedAt };
      } catch (err) {
        if (current) return { value: current.value as T, fetchedAt: current.fetchedAt };
        throw err;
      }
    }

    const run = (async (): Promise<Stored> => {
      const value = await loader();
      const stored: Stored = { value, storedAt: Date.now(), fetchedAt: new Date().toISOString() };
      this.store.set(key, stored);
      return stored;
    })();
    this.loading.set(key, run);

    try {
      const stored = await run;
      return { value: stored.value as T, fetchedAt: stored.fetchedAt };
    } catch (err) {
      // stale-while-error: serve the last good value if we have one
      if (current) return { value: current.value as T, fetchedAt: current.fetchedAt };
      throw err;
    } finally {
      this.loading.delete(key);
    }
  }
}

// Liveness: the current GW has a fixture that has started and is not finished.
// Read the latest cached fixtures, including data loaded during this request.
export class Liveness {
  constructor(
    private readonly getFixtures: () => FplFixture[] | undefined,
    private readonly getCurrentEvent: () => number | null
  ) {}

  isLive(): boolean {
    const fixtures = this.getFixtures();
    const event = this.getCurrentEvent();
    return fixtures?.some((f) => f.event === event && f.started && !f.finished) ?? false;
  }
}
