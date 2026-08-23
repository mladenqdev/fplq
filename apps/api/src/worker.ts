// Cloudflare Workers entry. Serves the SAME Hono app as the Node entry (src/index.ts),
// but backed by D1 for rank history and a Cron Trigger for the sampler. This module and
// its imports must NEVER pull in node:sqlite or @hono/node-server (those are isolated to
// src/index.ts and src/rankStore.sqlite.ts) or the Worker bundle would break.

import type {
  D1Database,
  ExecutionContext,
  Fetcher,
  ScheduledController,
} from '@cloudflare/workers-types';
import { AppContext, parseTrackedEntries } from './context';
import { D1RankStore } from './rankStore.d1';
import { createApp } from './app';
import { sampleTrackedEntriesOnce } from './sample';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  FPLQ_TRACKED_ENTRIES?: string;
}

// The routes only need `noteLiveRequest`. On Workers each request is a fresh isolate and
// the scheduled pass samples the configured tracked entries only, so recording ad-hoc
// requests would not survive to the next cron; a no-op is correct here.
const noopSink = { noteLiveRequest() {} };

// NOTE: the in-memory TTL cache lives on this AppContext, so on Workers it is per-isolate
// (each isolate keeps its own cache, and a fresh AppContext is built per invocation). That
// only means more upstream calls across isolates; correctness is unaffected. We do NOT try
// to share the cache across isolates in v1.
function buildContext(env: Env): AppContext {
  return new AppContext(parseTrackedEntries(env.FPLQ_TRACKED_ENTRIES), new D1RankStore(env.DB));
}

// Date.now() is pinned to 0 at Worker global scope, so capture the isolate's start
// lazily on the first request; uptimeSec then reports this isolate's age.
let startedAt = 0;

// Cron fires every minute (see wrangler.toml). Sample every minute while live; when idle
// only sample on the 15-minute marks, matching the Node sampler's 60s-live / 15min-idle
// cadence. Determining liveness needs bootstrap+fixtures warm, so idle non-mark minutes
// still do those two cached fetches but skip the per-entry loop, keeping them cheap.
async function runScheduledSample(ctx: AppContext, scheduledTime: number): Promise<void> {
  await Promise.allSettled([ctx.getBootstrap(), ctx.getFixtures()]);
  const live = ctx.liveness.isLive();
  const minute = new Date(scheduledTime).getUTCMinutes();
  if (!live && minute % 15 !== 0) return; // idle: sample only on 15-minute marks (60s live / 15min idle)
  await sampleTrackedEntriesOnce(ctx, ctx.trackedEntries);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // One Worker serves both halves: /api/* is the Hono app, everything else is the
    // built web app served from the ASSETS binding (SPA fallback -> index.html, so
    // client-side routes like /planner resolve). Same origin, so no CORS needed.
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      // Cast bridges the @cloudflare/workers-types Request/Response and the DOM
      // lib types (they differ only in getSetCookie/cf props); runtime is identical.
      const assetReq = request as unknown as Parameters<Fetcher['fetch']>[0];
      return env.ASSETS.fetch(assetReq) as unknown as Response;
    }
    if (startedAt === 0) startedAt = Date.now();
    const appCtx = buildContext(env);
    // No compress here: Cloudflare compresses at the edge (doing both double-encodes).
    const app = createApp(appCtx, noopSink, startedAt, { logger: false, compress: false });
    return app.fetch(request, env, ctx);
  },

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const appCtx = buildContext(env);
    ctx.waitUntil(runScheduledSample(appCtx, controller.scheduledTime));
  },
};
