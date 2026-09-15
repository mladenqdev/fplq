import type { FplFixture, FplLiveResponse, RecentPlayersDto } from '@fplq/shared';
import type { AppContext } from '../context';
import { fpl } from '../fplClient';

export function recentObservations(
  events: { event: number; live: FplLiveResponse }[],
  fixtures: FplFixture[],
  players: { id: number; team: number }[]
): RecentPlayersDto {
  const result: RecentPlayersDto = { throughEvent: events.at(-1)?.event ?? null, players: {} };
  for (const player of players) {
    const matches = events.flatMap(({ event, live }) => {
      const entry = live.elements.find((e) => e.id === player.id);
      if (!entry) return []; // Not registered / incomplete payload, not a DNP.
      const eligible = fixtures.filter(
        (f) =>
          f.event === event && f.finished && (f.team_h === player.team || f.team_a === player.team)
      );
      return eligible.map((fixture) => {
        const stats = entry.explain.find((e) => e.fixture === fixture.id)?.stats;
        return {
          fixture: fixture.id,
          event,
          minutes: stats?.find((s) => s.identifier === 'minutes')?.value ?? 0,
          defconPoints: stats?.find((s) => s.identifier === 'defensive_contribution')?.points ?? 0,
        };
      });
    });
    result.players[player.id] = matches.slice(-6);
  }
  return result;
}

export async function buildRecent(ctx: AppContext): Promise<RecentPlayersDto> {
  const [bootstrap, fixtures] = await Promise.all([ctx.getBootstrap(), ctx.getFixtures()]);
  const events = bootstrap.value.events.filter((e) => e.finished && e.data_checked).slice(-6);
  const responses = await Promise.all(
    events.map(async (event) => {
      const response = await ctx.cache.get(
        `recent-live:${event.id}`,
        { live: 86_400_000, idle: 86_400_000 },
        () => fpl.live(event.id)
      );
      return { event: event.id, live: response.value };
    })
  );
  return recentObservations(responses, fixtures.value, bootstrap.value.elements);
}
