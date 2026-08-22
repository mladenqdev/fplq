-- Rank sample history for tracked entries. Mirrors the node:sqlite schema in
-- rankStore.sqlite.ts (same columns and index) so both backends behave identically.
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
