// Workers-only rank store backed by a Cloudflare D1 binding (env.DB). Same table,
// columns, index, append (skip unchanged consecutive sample) and list semantics as
// SqliteRankStore. Uses parameterized queries. Never imported by the Node bundle.

import type { D1Database } from '@cloudflare/workers-types';
import { type RankStore, type RankSampleRow, type RawRankRow, toRankSampleRow } from './rankStore';

type LastRow = Pick<RawRankRow, 'overall_rank' | 'overall_points' | 'event_points' | 'event_rank'>;

export class D1RankStore implements RankStore {
  constructor(private readonly db: D1Database) {}

  async append(row: RankSampleRow): Promise<void> {
    const last = await this.db
      .prepare(
        `SELECT overall_rank, overall_points, event_points, event_rank
         FROM rank_samples WHERE entry = ? AND event = ? ORDER BY t DESC LIMIT 1`
      )
      .bind(row.entry, row.event)
      .first<LastRow>();

    // Skip writing when nothing changed since the previous sample.
    if (
      last &&
      last.overall_rank === row.overallRank &&
      last.overall_points === row.overallPoints &&
      last.event_points === row.eventPoints &&
      last.event_rank === row.eventRank
    ) {
      return;
    }

    await this.db
      .prepare(
        `INSERT INTO rank_samples (entry, event, t, overall_rank, overall_points, event_points, event_rank)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.entry,
        row.event,
        row.t,
        row.overallRank,
        row.overallPoints,
        row.eventPoints,
        row.eventRank
      )
      .run();
  }

  async list(entry: number, event: number): Promise<RankSampleRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT entry, event, t, overall_rank, overall_points, event_points, event_rank
         FROM rank_samples WHERE entry = ? AND event = ? ORDER BY t ASC`
      )
      .bind(entry, event)
      .all<RawRankRow>();
    return results.map(toRankSampleRow);
  }
}
