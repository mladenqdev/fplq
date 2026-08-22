// Shared application state: the cache, the liveness signal, the rank store, and the
// typed cached fetchers that every route builds on. Runtime-agnostic: the rank store
// is injected (SqliteRankStore on Node, D1RankStore on Workers) so this module never
// imports a node builtin and can be bundled for either runtime.

import type { FplBootstrap, FplFixture } from '@fplq/shared';
import { fpl } from './fplClient';
import { TtlCache, Liveness, TTL, type Cached } from './cache';
import { type RankStore } from './rankStore';
import { currentEventId } from './mappers/bootstrap';

export interface AppConfig {
  port: number;
  trackedEntries: number[];
  dbPath: string;
}

export function parseTrackedEntries(raw: string | undefined): number[] {
  return (raw ?? '')
    .split(',')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

// Node config from the process environment. The Workers entry builds its own tracked
// list from `env` via parseTrackedEntries and does not call this.
export function readConfig(env: NodeJS.ProcessEnv): AppConfig {
  const port = Number.parseInt(env.PORT ?? '8787', 10) || 8787;
  const trackedEntries = parseTrackedEntries(env.FPLQ_TRACKED_ENTRIES);
  const dbPath = env.FPLQ_DB_PATH ?? './data/fplq.sqlite';
  return { port, trackedEntries, dbPath };
}

export class AppContext {
  readonly cache = new TtlCache();
  readonly liveness: Liveness;

  constructor(
    readonly trackedEntries: number[],
    readonly rankStore: RankStore
  ) {
    this.liveness = new Liveness(
      () => this.cache.peek<FplFixture[]>('fixtures'),
      () => {
        const bootstrap = this.cache.peek<FplBootstrap>('bootstrap');
        return bootstrap ? currentEventId(bootstrap) : null;
      }
    );
    this.cache.isLive = () => this.liveness.isLive();
  }

  getBootstrap(): Promise<Cached<FplBootstrap>> {
    return this.cache.get('bootstrap', TTL.bootstrap, fpl.bootstrap);
  }
  getFixtures(): Promise<Cached<FplFixture[]>> {
    return this.cache.get('fixtures', TTL.fixtures, fpl.fixtures);
  }
  getFixturesByEvent(gw: number) {
    return this.cache.get(`fixtures:${gw}`, TTL.fixturesByEvent, () => fpl.fixturesByEvent(gw));
  }
  getLive(gw: number) {
    return this.cache.get(`live:${gw}`, TTL.live, () => fpl.live(gw));
  }
  getEventStatus() {
    return this.cache.get('event-status', TTL.eventStatus, fpl.eventStatus);
  }
  getEntry(id: number) {
    return this.cache.get(`entry:${id}`, TTL.entry, () => fpl.entry(id));
  }
  getHistory(id: number) {
    return this.cache.get(`history:${id}`, TTL.history, () => fpl.entryHistory(id));
  }
  getPicks(id: number, gw: number) {
    return this.cache.get(`picks:${id}:${gw}`, TTL.picks, () => fpl.picks(id, gw));
  }
  getTransfers(id: number) {
    return this.cache.get(`transfers:${id}`, TTL.transfers, () => fpl.transfers(id));
  }
  getElement(id: number) {
    return this.cache.get(`element:${id}`, TTL.element, () => fpl.element(id));
  }
  getLeague(id: number, page: number) {
    return this.cache.get(`league:${id}:${page}`, TTL.league, () => fpl.league(id, page));
  }
}
