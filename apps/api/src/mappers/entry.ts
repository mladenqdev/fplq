import type { FplEntry, EntryDto } from '@fplq/shared';

export function mapEntry(e: FplEntry, fetchedAt: string): EntryDto {
  return {
    id: e.id,
    name: e.name,
    playerName: `${e.player_first_name} ${e.player_last_name}`.trim(),
    regionName: e.player_region_name,
    currentEvent: e.current_event,
    startedEvent: e.started_event,
    overallPoints: e.summary_overall_points,
    overallRank: e.summary_overall_rank,
    eventPoints: e.summary_event_points,
    eventRank: e.summary_event_rank,
    lastDeadlineBank: e.last_deadline_bank,
    lastDeadlineValue: e.last_deadline_value,
    lastDeadlineTotalTransfers: e.last_deadline_total_transfers,
    leagues: e.leagues.classic.map((l) => ({
      id: l.id,
      name: l.name,
      entryRank: l.entry_rank,
      entryLastRank: l.entry_last_rank,
      rankCount: l.rank_count,
      leagueType: l.league_type,
    })),
    fetchedAt,
  };
}
