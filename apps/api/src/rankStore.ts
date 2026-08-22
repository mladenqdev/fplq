// Rank sample persistence. The interface keeps the storage swappable across runtimes:
// SqliteRankStore (Node, node:sqlite) lives in rankStore.sqlite.ts, D1RankStore
// (Cloudflare Workers) in rankStore.d1.ts. This module has no runtime deps so both
// runtimes can import the interface without pulling in the other's backend.
//
// The methods are async so a D1 (network) backend fits the same shape; the SQLite
// backend is synchronous under the hood and just resolves immediately.

export interface RankSampleRow {
  entry: number;
  event: number;
  t: string;
  overallRank: number;
  overallPoints: number;
  eventPoints: number;
  eventRank: number | null;
}

export interface RankStore {
  append(row: RankSampleRow): Promise<void>;
  list(entry: number, event: number): Promise<RankSampleRow[]>;
}

// Raw DB row (snake_case columns), shared by both backends' mappers.
export interface RawRankRow {
  entry: number;
  event: number;
  t: string;
  overall_rank: number;
  overall_points: number;
  event_points: number;
  event_rank: number | null;
}

export function toRankSampleRow(r: RawRankRow): RankSampleRow {
  return {
    entry: r.entry,
    event: r.event,
    t: r.t,
    overallRank: r.overall_rank,
    overallPoints: r.overall_points,
    eventPoints: r.event_points,
    eventRank: r.event_rank,
  };
}
