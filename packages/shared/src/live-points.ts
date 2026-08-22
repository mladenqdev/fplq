// Rule 3.5: live team points.
// Each row's `points` is the official live total_points plus provisional bonus when
// the fixture's bonus stat is still empty (rule 3.1). The team total sums the
// effective XI after projected auto subs, then subtracts the transfer hit.

export interface LivePointsRow {
  points: number;
  multiplier: number; // effective multiplier (0 for the final bench)
}

export interface LivePointsResult {
  computedPoints: number;
  pointsOnBench: number;
}

export function computeLivePoints(rows: LivePointsRow[], transfersCost: number): LivePointsResult {
  let team = 0;
  let bench = 0;
  for (const row of rows) {
    if (row.multiplier > 0) team += row.points * row.multiplier;
    else bench += row.points;
  }
  return { computedPoints: team - transfersCost, pointsOnBench: bench };
}
