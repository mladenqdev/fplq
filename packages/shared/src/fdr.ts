// Rule 3.9: fixture difficulty rating.

export type FdrBand = 'good' | 'neutral' | 'bad' | 'severe';

export const BLANK_DIFFICULTY = 5;

export function fdrBand(difficulty: number): FdrBand {
  if (difficulty <= 2) return 'good';
  if (difficulty === 3) return 'neutral';
  if (difficulty === 4) return 'bad';
  return 'severe';
}

// 1 and 2 green, 3 grey, 4 red-ish, 5 dark red.
export function fdrColor(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return '#00875a';
    case 2:
      return '#01ce7c';
    case 3:
      return '#8a8a8a';
    case 4:
      return '#d64550';
    default:
      return '#7a1420';
  }
}

// A team's difficulty for one GW: blanks count as 5, doubles sum both fixtures.
export function gwTickerScore(difficulties: number[]): number {
  if (difficulties.length === 0) return BLANK_DIFFICULTY;
  return difficulties.reduce((sum, d) => sum + d, 0);
}

// Ticker score for a team across a range of GWs (outer array is one entry per GW).
export function tickerScore(gwDifficulties: number[][]): number {
  return gwDifficulties.reduce((sum, gw) => sum + gwTickerScore(gw), 0);
}
