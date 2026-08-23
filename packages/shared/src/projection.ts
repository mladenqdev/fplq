// Projected points ESTIMATE for a future gameweek. The FPL API exposes no per-future-GW
// expected points, so this is a documented heuristic, not an official number: a blend of a
// player's per-match expectation, scaled by fixture difficulty (rule 3.9) and availability.
// The UI must label the output as an estimate.

export interface ProjectionInput {
  epNext: number;
  epThis: number;
  pointsPerGame: number;
  form: number;
  status: string;
}

export interface ProjectionFixture {
  difficulty: number;
}

// status: a available, d doubtful, i injured, s suspended, u/n unavailable.
const OUT_STATUSES = new Set(['i', 's', 'u', 'n']);
const DOUBT_STATUS = 'd';
const DOUBT_SCALE = 0.5;

// A per-match base above this is almost certainly noise from a small sample; clamp it.
const MAX_PER_MATCH_BASE = 15;

export const FDR_STEP = 0.15;
export const FDR_MULT_MIN = 0.6;
export const FDR_MULT_MAX = 1.4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Difficulty multiplier centered on the neutral rating 3: easier fixtures scale up, harder
// ones scale down, bounded to a sensible band.
export function fdrMultiplier(difficulty: number): number {
  return clamp(1 + (3 - difficulty) * FDR_STEP, FDR_MULT_MIN, FDR_MULT_MAX);
}

// Per-match expected return before fixtures are applied. Out (injured/suspended/
// unavailable) => 0, doubtful => halved.
export function perMatchBase(input: ProjectionInput): number {
  if (OUT_STATUSES.has(input.status)) return 0;
  const candidates = [input.epNext, input.epThis, input.pointsPerGame, input.form].filter(
    (n) => Number.isFinite(n) && n > 0
  );
  let base = candidates.length > 0 ? Math.max(...candidates) : 0;
  if (input.status === DOUBT_STATUS) base *= DOUBT_SCALE;
  return clamp(base, 0, MAX_PER_MATCH_BASE);
}

// Estimated points for a player across one GW's fixtures. A double GW sums both fixtures,
// a blank GW (no fixtures) is 0. Rounded to 1 decimal.
export function projectPlayerPoints(input: ProjectionInput, fixtures: ProjectionFixture[]): number {
  const base = perMatchBase(input);
  if (base <= 0 || fixtures.length === 0) return 0;
  const total = fixtures.reduce((sum, f) => sum + base * fdrMultiplier(f.difficulty), 0);
  return round1(total);
}

// Sum a set of per-player projections, applying an optional per-player multiplier (e.g. a
// captain's 2 or triple captain's 3). Rounded to 1 decimal.
export function teamProjection(perPlayer: number[], multipliers?: number[]): number {
  const total = perPlayer.reduce((sum, p, i) => sum + p * (multipliers?.[i] ?? 1), 0);
  return round1(total);
}
