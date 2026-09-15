/** Completed-match observations. Missing upstream data must not become a zero. */
export interface RecentMatch {
  fixture: number;
  event: number;
  minutes: number;
  defconPoints: number;
}

export interface RecentPlayersDto {
  throughEvent: number | null;
  players: Record<number, RecentMatch[]>;
}
