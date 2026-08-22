// Node-only rank store backed by node:sqlite. This is the ONLY place (besides
// src/index.ts) that imports node builtins, so the Workers bundle never pulls them in.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  type RankStore,
  type RankSampleRow,
  type RawRankRow,
  toRankSampleRow,
} from './rankStore';

export class SqliteRankStore implements RankStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rank_samples (
        entry INTEGER NOT NULL,
        event INTEGER NOT NULL,
        t TEXT NOT NULL,
        overall_rank INTEGER NOT NULL,
        overall_points INTEGER NOT NULL,
        event_points INTEGER NOT NULL,
        event_rank INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_rank_samples ON rank_samples (entry, event, t);
    `);
  }

  async append(row: RankSampleRow): Promise<void> {
    const last = this.db
      .prepare(
        `SELECT overall_rank, overall_points, event_points, event_rank
         FROM rank_samples WHERE entry = ? AND event = ? ORDER BY t DESC LIMIT 1`
      )
      .get(row.entry, row.event) as unknown as
      | Pick<RawRankRow, 'overall_rank' | 'overall_points' | 'event_points' | 'event_rank'>
      | undefined;

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

    this.db
      .prepare(
        `INSERT INTO rank_samples (entry, event, t, overall_rank, overall_points, event_points, event_rank)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.entry,
        row.event,
        row.t,
        row.overallRank,
        row.overallPoints,
        row.eventPoints,
        row.eventRank
      );
  }

  async list(entry: number, event: number): Promise<RankSampleRow[]> {
    const rows = this.db
      .prepare(
        `SELECT entry, event, t, overall_rank, overall_points, event_points, event_rank
         FROM rank_samples WHERE entry = ? AND event = ? ORDER BY t ASC`
      )
      .all(entry, event) as unknown as RawRankRow[];
    return rows.map(toRankSampleRow);
  }
}
