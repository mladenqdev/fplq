import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { UpstreamError } from './fplClient';
import type { AppContext } from './context';
import type { LiveRequestSink } from './sampler';
import { registerCoreRoutes } from './routes/core';
import { registerEntryRoutes } from './routes/entry';
import { registerMiscRoutes } from './routes/misc';

export interface AppOptions {
  // Whether to attach the request logger. The caller decides so this module stays
  // runtime-agnostic (no process.env read at request time, which would break Workers).
  logger?: boolean;
  // Whether to gzip responses in the app. On Node (@hono/node-server does not compress)
  // this is on; on Cloudflare Workers it MUST be off, since the platform compresses at
  // the edge and doing both double-encodes the body.
  compress?: boolean;
}

export function createApp(
  ctx: AppContext,
  sampler: LiveRequestSink,
  startedAt: number,
  options: AppOptions = {}
): Hono {
  const app = new Hono();

  if (options.compress) app.use('*', compress());
  app.use('*', cors());
  if (options.logger) app.use('*', logger());

  registerCoreRoutes(app, ctx, startedAt);
  registerEntryRoutes(app, ctx, sampler);
  registerMiscRoutes(app, ctx);

  app.notFound((c) => c.json({ error: 'not found' }, 404));

  app.onError((err, c) => {
    if (err instanceof UpstreamError) {
      return c.json({ error: err.message }, err.status === 404 ? 404 : 502);
    }
    const message = err instanceof Error ? err.message : 'internal error';
    return c.json({ error: message }, 500);
  });

  return app;
}
