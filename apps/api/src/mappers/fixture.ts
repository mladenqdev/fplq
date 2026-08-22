import type { FplFixture, FixtureDto, FixtureStatDto } from '@fplq/shared';
import { fixtureBonus } from '@fplq/shared';

function mapStats(fixture: FplFixture): FixtureStatDto[] {
  return fixture.stats.map((s) => ({
    identifier: s.identifier,
    h: s.h.map((e) => ({ element: e.element, value: e.value })),
    a: s.a.map((e) => ({ element: e.element, value: e.value })),
  }));
}

// Rule 3.1: provisional (or confirmed) bonus per player, attached when stats are asked for.
function mapProvisionalBonus(fixture: FplFixture): { element: number; bonus: number }[] {
  const { bonus } = fixtureBonus(fixture);
  return [...bonus.entries()].map(([element, value]) => ({ element, bonus: value }));
}

export function mapFixture(fixture: FplFixture, withStats: boolean): FixtureDto {
  const base: FixtureDto = {
    id: fixture.id,
    code: fixture.code,
    event: fixture.event,
    kickoffTime: fixture.kickoff_time,
    started: fixture.started,
    finished: fixture.finished,
    finishedProvisional: fixture.finished_provisional,
    minutes: fixture.minutes,
    teamH: fixture.team_h,
    teamA: fixture.team_a,
    teamHScore: fixture.team_h_score,
    teamAScore: fixture.team_a_score,
    teamHDifficulty: fixture.team_h_difficulty,
    teamADifficulty: fixture.team_a_difficulty,
  };
  if (!withStats) return base;
  return { ...base, stats: mapStats(fixture), provisionalBonus: mapProvisionalBonus(fixture) };
}
