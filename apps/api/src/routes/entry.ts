import type { Hono } from 'hono';
import type { FtInput, HistoryDto, RankHistoryDto } from '@fplq/shared';
import { freeTransfersByEvent } from '@fplq/shared';
import type { AppContext } from '../context';
import type { LiveRequestSink } from '../sampler';
import { mapEntry } from '../mappers/entry';
import { buildEntryLive } from '../builders/entryLive';
import { buildSquad } from '../builders/squad';
import { json, intParam } from './util';

export function registerEntryRoutes(app: Hono, ctx: AppContext, sampler: LiveRequestSink): void {
  app.get('/api/entry/:id', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid entry id' }, 400);
    const entry = await ctx.getEntry(id);
    return json(c, mapEntry(entry.value, entry.fetchedAt), entry.fetchedAt);
  });

  app.get('/api/entry/:id/history', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid entry id' }, 400);
    const [entry, history] = await Promise.all([ctx.getEntry(id), ctx.getHistory(id)]);

    const ftInput: FtInput = {
      startedEvent: entry.value.started_event,
      history: history.value.current.map((r) => ({ event: r.event, transfers: r.event_transfers })),
      chipEvents: history.value.chips.map((ch) => ({ name: ch.name, event: ch.event })),
    };
    const freeTransfers = [...freeTransfersByEvent(ftInput).entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([event, available]) => ({ event, available }));

    const dto: HistoryDto = {
      current: history.value.current,
      past: history.value.past,
      chips: history.value.chips,
      freeTransfers,
    };
    return json(c, dto, history.fetchedAt);
  });

  app.get('/api/entry/:id/picks/:gw', async (c) => {
    const id = intParam(c, 'id');
    const gw = intParam(c, 'gw');
    if (id === null || gw === null) return c.json({ error: 'invalid entry or gameweek' }, 400);
    const picks = await ctx.getPicks(id, gw);
    return json(c, picks.value, picks.fetchedAt);
  });

  app.get('/api/entry/:id/transfers', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid entry id' }, 400);
    const transfers = await ctx.getTransfers(id);
    return json(c, transfers.value, transfers.fetchedAt);
  });

  app.get('/api/entry/:id/live/:gw', async (c) => {
    const id = intParam(c, 'id');
    const gw = intParam(c, 'gw');
    if (id === null || gw === null) return c.json({ error: 'invalid entry or gameweek' }, 400);
    sampler.noteLiveRequest(id);
    const dto = await buildEntryLive(ctx, id, gw);
    return json(c, dto, dto.fetchedAt);
  });

  app.get('/api/entry/:id/squad', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid entry id' }, 400);
    const dto = await buildSquad(ctx, id);
    return json(c, dto, dto.fetchedAt);
  });

  app.get('/api/entry/:id/rank-history/:gw', async (c) => {
    const id = intParam(c, 'id');
    const gw = intParam(c, 'gw');
    if (id === null || gw === null) return c.json({ error: 'invalid entry or gameweek' }, 400);
    const rows = await ctx.rankStore.list(id, gw);
    const samples = rows.map((r) => ({
      t: r.t,
      overallRank: r.overallRank,
      overallPoints: r.overallPoints,
      eventPoints: r.eventPoints,
      eventRank: r.eventRank,
    }));
    const dto: RankHistoryDto = { samples };
    return c.json(dto);
  });
}
