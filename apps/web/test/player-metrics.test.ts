import { describe, expect, it } from 'vitest';
import { formatPlayerMetric, playerMetricValue } from '../src/features/players/player-metrics';

const player = { pointsPerGame: 5.2, xg: 2.4, xa: 1.2, xgi: 3.6, minutes: 315 };
const appearances = { appearances: 4, total: 22, perGame: 5.5 };

describe('player per-appearance metrics', () => {
  it('uses the exact appearance denominator for attacking stats and minutes', () => {
    expect(playerMetricValue(player, 'xgPerGame', appearances)).toBe(0.6);
    expect(playerMetricValue(player, 'xaPerGame', appearances)).toBe(0.3);
    expect(playerMetricValue(player, 'xgiPerGame', appearances)).toBe(0.9);
    expect(playerMetricValue(player, 'minutesPerGame', appearances)).toBe(78.75);
  });

  it('returns missing values when the player has no appearance denominator', () => {
    expect(playerMetricValue(player, 'xgPerGame', undefined)).toBeNull();
    expect(
      playerMetricValue(player, 'defconsPerGame', { ...appearances, appearances: 0 })
    ).toBeNull();
    expect(playerMetricValue(player, 'pointsPerGame', undefined)).toBe(5.2);
  });

  it('formats rates consistently', () => {
    expect(formatPlayerMetric('xgiPerGame', 0.9)).toBe('0.90');
    expect(formatPlayerMetric('defconsPerGame', 5.5)).toBe('5.5');
    expect(formatPlayerMetric('minutesPerGame', 78.75)).toBe('79');
  });
});
