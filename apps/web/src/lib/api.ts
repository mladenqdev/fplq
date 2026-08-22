import type {
  BootstrapDto,
  EntryDto,
  EntryLiveDto,
  FixtureDto,
  HistoryDto,
  LadderDto,
  RankHistoryDto,
  SquadDto,
} from '@fplq/shared';

export interface ApiError extends Error {
  status: number;
}

// Same-origin by default (empty base), which keeps the Vite dev proxy working. In
// production on Pages, set VITE_API_BASE to the Worker URL (e.g.
// https://fplq-api.fplq.workers.dev) at build time.
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body, keep the status line
    }
    const err = new Error(message) as ApiError;
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export interface HealthDto {
  ok: boolean;
  live: boolean;
  currentEvent: number | null;
  uptimeSec: number;
}

// Raw FPL league standings (not remapped by our API).
export interface LeagueStandingRow {
  entry: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total: number;
  rank: number;
  rank_sort: number;
  last_rank: number;
}

export interface LeagueDto {
  league: { id: number; name: string; league_type: string };
  standings: {
    has_next: boolean;
    page: number;
    results: LeagueStandingRow[];
  };
}

// Raw element-summary shape (upstream, only the fields we render).
export interface ElementFixtureRow {
  id: number;
  event: number | null;
  event_name: string | null;
  is_home: boolean;
  difficulty: number;
  team_h: number;
  team_a: number;
  kickoff_time: string | null;
  finished: boolean;
}

export interface ElementHistoryRow {
  round: number;
  opponent_team: number;
  was_home: boolean;
  total_points: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  bonus: number;
  bps: number;
  value: number;
  selected: number;
  expected_goal_involvements: string;
  kickoff_time: string | null;
}

export interface ElementSummaryDto {
  fixtures: ElementFixtureRow[];
  history: ElementHistoryRow[];
  history_past: unknown[];
}

export const api = {
  health: () => get<HealthDto>('/health'),
  bootstrap: () => get<BootstrapDto>('/bootstrap'),
  fixtures: () => get<FixtureDto[]>('/fixtures'),
  fixturesForGw: (gw: number) => get<FixtureDto[]>(`/fixtures/${gw}`),
  entry: (id: number) => get<EntryDto>(`/entry/${id}`),
  entryHistory: (id: number) => get<HistoryDto>(`/entry/${id}/history`),
  entryLive: (id: number, gw: number) => get<EntryLiveDto>(`/entry/${id}/live/${gw}`),
  rankHistory: (id: number, gw: number) => get<RankHistoryDto>(`/entry/${id}/rank-history/${gw}`),
  squad: (id: number) => get<SquadDto>(`/entry/${id}/squad`),
  ladder: () => get<LadderDto>('/overall/ladder'),
  league: (id: number, page = 1) => get<LeagueDto>(`/league/${id}?page=${page}`),
  element: (id: number) => get<ElementSummaryDto>(`/element/${id}`),
};
