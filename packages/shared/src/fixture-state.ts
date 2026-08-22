// Rule 3.2: fixture state for a player in a GW, from that player's team fixtures.

import type { FplFixture } from './fpl-types';
import type { FixtureStateName } from './dto';

export function fixtureState(teamFixtures: FplFixture[]): FixtureStateName {
  if (teamFixtures.length === 0) return 'blank';
  if (teamFixtures.every((f) => f.finished_provisional)) return 'finished';
  if (teamFixtures.some((f) => f.started)) return 'live';
  return 'not_started';
}

// A player "did not play" only when their GW is finished and they logged no minutes.
export function didNotPlay(state: FixtureStateName, minutes: number): boolean {
  return state === 'finished' && minutes === 0;
}
