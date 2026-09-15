import type { ElementDto } from '@fplq/shared';

export interface AppearanceStats {
  appearances: number;
  total: number;
  perGame: number | null;
}

export type PlayerMetricKey =
  'pointsPerGame' | 'xgPerGame' | 'xaPerGame' | 'xgiPerGame' | 'defconsPerGame' | 'minutesPerGame';

export const PLAYER_METRICS: { key: PlayerMetricKey; label: string }[] = [
  { key: 'pointsPerGame', label: 'Pts/game' },
  { key: 'xgPerGame', label: 'xG/game' },
  { key: 'xaPerGame', label: 'xA/game' },
  { key: 'xgiPerGame', label: 'xGI/game' },
  { key: 'defconsPerGame', label: 'Defcons/game' },
  { key: 'minutesPerGame', label: 'Mins/game' },
];

type MetricElement = Pick<ElementDto, 'pointsPerGame' | 'xg' | 'xa' | 'xgi' | 'minutes'>;

export function playerMetricValue(
  element: MetricElement,
  metric: PlayerMetricKey,
  appearance: AppearanceStats | undefined
): number | null {
  if (metric === 'pointsPerGame') return element.pointsPerGame;
  if (!appearance || appearance.appearances <= 0) return null;
  if (metric === 'xgPerGame') return element.xg / appearance.appearances;
  if (metric === 'xaPerGame') return element.xa / appearance.appearances;
  if (metric === 'xgiPerGame') return element.xgi / appearance.appearances;
  if (metric === 'minutesPerGame') return element.minutes / appearance.appearances;
  return appearance.perGame;
}

export function formatPlayerMetric(metric: PlayerMetricKey, value: number | null): string {
  if (value == null) return '–';
  if (metric === 'minutesPerGame') return `${Math.round(value)}`;
  return value.toFixed(metric === 'pointsPerGame' || metric === 'defconsPerGame' ? 1 : 2);
}

export function metricNeedsAppearances(metric: PlayerMetricKey): boolean {
  return metric !== 'pointsPerGame';
}
