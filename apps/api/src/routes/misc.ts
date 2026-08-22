import type { Hono } from 'hono';
import type { LadderDto, LadderRungDto, FplLeagueStandingResult } from '@fplq/shared';
import type { AppContext } from '../context';
import { currentEventId } from '../mappers/bootstrap';
import { json, intParam } from './util';

const OVERALL_LEAGUE = 314;
const LADDER_RANKS = [
  1000, 10000, 50000, 100000, 250000, 500000, 1000000, 2000000, 3000000, 5000000,
];
const PAGE_SIZE = 50;

export function registerMiscRoutes(app: Hono, ctx: AppContext): void {
  app.get('/api/overall/ladder', async (c) => {
    const pages = [...new Set(LADDER_RANKS.map((r) => Math.ceil(r / PAGE_SIZE)))];
    const settled = await Promise.allSettled(pages.map((p) => ctx.getLeague(OVERALL_LEAGUE, p)));

    const byPage = new Map<number, { results: FplLeagueStandingResult[]; fetchedAt: string }>();
    pages.forEach((page, i) => {
      const result = settled[i];
      if (result && result.status === 'fulfilled') {
        byPage.set(page, {
          results: result.value.value.standings.results,
          fetchedAt: result.value.fetchedAt,
        });
      }
    });

    // GW1 has huge ties, so the standings `rank` value jumps; the score "at rank N" is
    // the entry at position N by rank_sort, i.e. index (N-1) % 50 on page ceil(N/50).
    const rungs: LadderRungDto[] = [];
    for (const rank of LADDER_RANKS) {
      const data = byPage.get(Math.ceil(rank / PAGE_SIZE));
      const row = data?.results[(rank - 1) % PAGE_SIZE];
      if (row) rungs.push({ rank, total: row.total, eventTotal: row.event_total });
    }

    let event: number | null = null;
    let fetchedAt = [...byPage.values()][0]?.fetchedAt ?? new Date().toISOString();
    try {
      const bootstrap = await ctx.getBootstrap();
      event = currentEventId(bootstrap.value);
    } catch {
      // ladder is still useful without the event label
    }

    const dto: LadderDto = { event, fetchedAt, rungs };
    return json(c, dto, fetchedAt);
  });

  app.get('/api/league/:id', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid league id' }, 400);
    const page = Number.parseInt(c.req.query('page') ?? '1', 10) || 1;
    const league = await ctx.getLeague(id, page);
    return json(c, league.value, league.fetchedAt);
  });

  app.get('/api/element/:id', async (c) => {
    const id = intParam(c, 'id');
    if (id === null) return c.json({ error: 'invalid element id' }, 400);
    const element = await ctx.getElement(id);
    return json(c, element.value, element.fetchedAt);
  });
}
