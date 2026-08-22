import type { Hono } from 'hono';
import type { AppContext } from '../context';
import { mapBootstrap, currentEventId } from '../mappers/bootstrap';
import { mapFixture } from '../mappers/fixture';
import { json, intParam } from './util';

export function registerCoreRoutes(app: Hono, ctx: AppContext, startedAt: number): void {
  app.get('/api/health', async (c) => {
    let currentEvent: number | null = null;
    try {
      const bootstrap = await ctx.getBootstrap();
      currentEvent = currentEventId(bootstrap.value);
    } catch {
      // health stays up even when the upstream is unreachable
    }
    return c.json({
      ok: true,
      live: ctx.liveness.isLive(),
      currentEvent,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    });
  });

  app.get('/api/bootstrap', async (c) => {
    const bootstrap = await ctx.getBootstrap();
    return json(c, mapBootstrap(bootstrap.value, bootstrap.fetchedAt), bootstrap.fetchedAt);
  });

  app.get('/api/fixtures', async (c) => {
    const fixtures = await ctx.getFixtures();
    return json(
      c,
      fixtures.value.map((f) => mapFixture(f, false)),
      fixtures.fetchedAt
    );
  });

  app.get('/api/fixtures/:gw', async (c) => {
    const gw = intParam(c, 'gw');
    if (gw === null) return c.json({ error: 'invalid gameweek' }, 400);
    const fixtures = await ctx.getFixturesByEvent(gw);
    return json(
      c,
      fixtures.value.map((f) => mapFixture(f, true)),
      fixtures.fetchedAt
    );
  });

  app.get('/api/live/:gw', async (c) => {
    const gw = intParam(c, 'gw');
    if (gw === null) return c.json({ error: 'invalid gameweek' }, 400);
    const live = await ctx.getLive(gw);
    const elements = Object.fromEntries(
      live.value.elements.map((e) => [e.id, { id: e.id, stats: e.stats, explain: e.explain }])
    );
    return json(c, { event: gw, fetchedAt: live.fetchedAt, elements }, live.fetchedAt);
  });

  app.get('/api/event-status', async (c) => {
    const status = await ctx.getEventStatus();
    return json(c, status.value, status.fetchedAt);
  });
}
