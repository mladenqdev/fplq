import { expect, it } from 'vitest';
import type { FplFixture, FplLiveResponse } from '@fplq/shared';
import { recentObservations } from '../src/builders/recent';

it('preserves missed matches and separate DC outcomes in a double; excludes unfinished matches and missing players', () => {
  const fixtures = [1, 2, 3].map((id) => ({
    id,
    event: 1,
    team_h: 1,
    team_a: 2,
    finished: id !== 3,
  })) as FplFixture[];
  const live = {
    elements: [
      {
        id: 1,
        explain: [
          {
            fixture: 1,
            stats: [
              { identifier: 'minutes', value: 90 },
              { identifier: 'defensive_contribution', value: 20, points: 2 },
            ],
          },
          {
            fixture: 2,
            stats: [
              { identifier: 'minutes', value: 30 },
              { identifier: 'defensive_contribution', value: 8, points: 0 },
            ],
          },
        ],
      },
      { id: 2, explain: [] },
    ],
  } as unknown as FplLiveResponse;
  const result = recentObservations([{ event: 1, live }], fixtures, [
    { id: 1, team: 1 },
    { id: 2, team: 2 },
    { id: 3, team: 1 },
  ]);
  expect(result.players[1]?.map((p) => [p.minutes, p.defconPoints])).toEqual([
    [90, 2],
    [30, 0],
  ]);
  expect(result.players[2]?.map((p) => p.minutes)).toEqual([0, 0]);
  expect(result.players[3]).toEqual([]);
});
