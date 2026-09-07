import type { FplLiveResponse } from '@fplq/shared';
import type { AppContext } from '../context';
import { fpl } from '../fplClient';
import { TTL } from '../cache';

export interface PlayerDefcons {
  appearances: number;
  total: number;
  perGame: number | null;
}

export function eventDefcons(live: FplLiveResponse): Record<number, PlayerDefcons> {
  return Object.fromEntries(
    live.elements.map((el) => {
      const appearances = el.explain.filter((fixture) =>
        fixture.stats.some((s) => s.identifier === 'minutes' && s.value > 0)
      ).length;
      const total = el.stats.defensive_contribution ?? 0;
      return [el.id, { appearances, total, perGame: appearances > 0 ? total / appearances : null }];
    })
  );
}

export async function buildDefcons(ctx: AppContext) {
  const bootstrap = await ctx.getBootstrap();
  const events = bootstrap.value.events.filter((e) => Date.parse(e.deadline_time) <= Date.now());
  const players: Record<number, PlayerDefcons> = {};
  // Keep only compact per-event totals in cache, not a season of full live payloads.
  for (let offset = 0; offset < events.length; offset += 4) {
    const batch = await Promise.all(
      events
        .slice(offset, offset + 4)
        .map((event) =>
          ctx.cache.get(
            `defcons:${event.id}`,
            event.data_checked ? { live: 86_400_000, idle: 86_400_000 } : TTL.live,
            async () => eventDefcons(await fpl.live(event.id))
          )
        )
    );
    for (const result of batch)
      for (const [id, value] of Object.entries(result.value)) {
        const player = players[Number(id)] ?? { appearances: 0, total: 0, perGame: null };
        player.appearances += value.appearances;
        player.total += value.total;
        players[Number(id)] = player;
      }
  }
  for (const player of Object.values(players))
    player.perGame = player.appearances > 0 ? player.total / player.appearances : null;
  return { players };
}
