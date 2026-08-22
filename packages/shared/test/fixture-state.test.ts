import { describe, it, expect } from 'vitest';
import { fixtureState, didNotPlay } from '../src/index';
import type { FplFixture } from '../src/index';

function fx(partial: Partial<FplFixture>): FplFixture {
  return {
    id: 0,
    code: 0,
    event: 1,
    kickoff_time: null,
    started: false,
    finished: false,
    finished_provisional: false,
    minutes: 0,
    provisional_start_time: false,
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
    stats: [],
    ...partial,
  };
}

describe('fixtureState (rule 3.2)', () => {
  it('blank when the team has no fixture', () => {
    expect(fixtureState([])).toBe('blank');
  });

  it('not_started when no fixture has started', () => {
    expect(fixtureState([fx({ started: false })])).toBe('not_started');
  });

  it('live when a fixture has started but is not finished_provisional', () => {
    expect(fixtureState([fx({ started: true, finished_provisional: false })])).toBe('live');
  });

  it('finished when all fixtures are finished_provisional', () => {
    expect(fixtureState([fx({ started: true, finished_provisional: true })])).toBe('finished');
  });

  it('double gameweek is live until every fixture is finished_provisional', () => {
    const both = [
      fx({ started: true, finished_provisional: true }),
      fx({ started: true, finished_provisional: false }),
    ];
    expect(fixtureState(both)).toBe('live');
  });

  it('double gameweek is finished only when both are finished_provisional', () => {
    const both = [
      fx({ started: true, finished_provisional: true }),
      fx({ started: true, finished_provisional: true }),
    ];
    expect(fixtureState(both)).toBe('finished');
  });
});

describe('didNotPlay', () => {
  it('true only when finished and no minutes', () => {
    expect(didNotPlay('finished', 0)).toBe(true);
    expect(didNotPlay('finished', 12)).toBe(false);
    expect(didNotPlay('live', 0)).toBe(false);
    expect(didNotPlay('not_started', 0)).toBe(false);
    expect(didNotPlay('blank', 0)).toBe(false);
  });
});
