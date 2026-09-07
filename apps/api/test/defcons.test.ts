import { describe, expect, it } from 'vitest';
import type { FplLiveResponse } from '@fplq/shared';
import { eventDefcons } from '../src/builders/defcons';

describe('Defcons per appearance', () => {
  it('counts substitute appearances and each played fixture in a double gameweek', () => {
    const live = {
      elements: [
        {
          id: 1,
          stats: { defensive_contribution: 25 },
          explain: [
            { stats: [{ identifier: 'minutes', value: 90 }] },
            { stats: [{ identifier: 'minutes', value: 8 }] },
          ],
        },
        {
          id: 2,
          stats: { defensive_contribution: 0 },
          explain: [{ stats: [{ identifier: 'minutes', value: 0 }] }],
        },
        {
          id: 3,
          stats: { defensive_contribution: 3 },
          explain: [
            { stats: [{ identifier: 'minutes', value: 9 }] },
            { stats: [{ identifier: 'minutes', value: 0 }] },
          ],
        },
      ],
    } as FplLiveResponse;
    expect(eventDefcons(live)).toEqual({
      1: { total: 25, appearances: 2, perGame: 12.5 },
      2: { total: 0, appearances: 0, perGame: null },
      3: { total: 3, appearances: 1, perGame: 3 },
    });
  });
});
