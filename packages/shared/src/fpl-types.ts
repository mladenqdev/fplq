// Raw Fantasy Premier League API shapes. This is the single typed boundary for
// upstream data: numeric strings (form, selected_by_percent, expected_goals, ...)
// are typed as `string` here and parsed exactly once in the API mappers.

export interface FplChipOverrides {
  rules: Record<string, unknown>;
  scoring: Record<string, unknown>;
  element_types: number[];
  pick_multiplier: number | null;
}

export interface FplChip {
  id: number;
  name: string;
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: string;
  overrides: FplChipOverrides;
}

export interface FplChipPlay {
  chip_name: string;
  num_played: number;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_score: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  ranked_count: number;
  chip_plays: FplChipPlay[];
  most_selected: number | null;
  most_captained: number | null;
  most_vice_captained: number | null;
  most_transferred_in: number | null;
  top_element: number | null;
  top_element_info: { id: number; points: number } | null;
  transfers_made: number;
}

export interface FplTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FplElementType {
  id: number;
  singular_name: string;
  singular_name_short: string;
  plural_name: string;
  plural_name_short: string;
  squad_select: number;
  squad_min_select: number;
  squad_max_select: number;
  squad_min_play: number;
  squad_max_play: number;
}

export interface FplPriceChangeProjection {
  offset: number;
  projected_percent: string;
  likelihood: number;
}

export interface FplElement {
  id: number;
  code: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  team_code: number;
  element_type: number;
  now_cost: number;
  cost_change_start: number;
  cost_change_event: number;
  status: string;
  news: string;
  news_added: string | null;
  chance_of_playing_next_round: number | null;
  selected_by_percent: string;
  total_points: number;
  event_points: number;
  form: string;
  points_per_game: string;
  minutes: number;
  starts: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  bonus: number;
  bps: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  defensive_contribution: number;
  ict_index: string;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  expected_goal_involvements_per_90: number;
  expected_goals_conceded_per_90: number;
  ep_next: string | null;
  ep_this: string | null;
  price_change_percent: string;
  price_change_projections: FplPriceChangeProjection[];
  transfers_in_event: number;
  transfers_out_event: number;
  photo: string;
  penalties_order: number | null;
  corners_and_indirect_freekicks_order: number | null;
  direct_freekicks_order: number | null;
  scout_risks: unknown[];
}

export interface FplBootstrap {
  chips: FplChip[];
  events: FplEvent[];
  teams: FplTeam[];
  element_types: FplElementType[];
  elements: FplElement[];
  total_players: number;
  game_config: {
    settings: {
      price_change_deadlines?: string[];
    };
  };
  game_settings: {
    squad_team_limit: number;
    squad_total_spend: number;
    max_extra_free_transfers: number;
    transfers_cap: number;
    transfers_sell_on_fee: number;
  };
}

export interface FplFixtureStatEntry {
  value: number;
  element: number;
}

export interface FplFixtureStat {
  identifier: string;
  h: FplFixtureStatEntry[];
  a: FplFixtureStatEntry[];
}

export interface FplFixture {
  id: number;
  code: number;
  event: number | null;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes: number;
  provisional_start_time: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  stats: FplFixtureStat[];
}

export interface FplLiveStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  defensive_contribution: number;
  starts: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  total_points: number;
  in_dreamteam: boolean;
  played?: boolean;
}

export interface FplExplainStat {
  identifier: string;
  points: number;
  value: number;
  points_modification: number;
}

export interface FplExplain {
  fixture: number;
  stats: FplExplainStat[];
}

export interface FplLiveElement {
  id: number;
  stats: FplLiveStats;
  explain: FplExplain[];
}

export interface FplLiveResponse {
  elements: FplLiveElement[];
}

export interface FplEntryLeague {
  id: number;
  name: string;
  short_name: string | null;
  entry_rank: number;
  entry_last_rank: number;
  rank_count: number;
  league_type: string;
}

export interface FplEntry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  current_event: number | null;
  started_event: number;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number | null;
  last_deadline_bank: number | null;
  last_deadline_value: number | null;
  last_deadline_total_transfers: number;
  leagues: {
    classic: FplEntryLeague[];
  };
}

export interface FplHistoryCurrentRow {
  event: number;
  points: number;
  total_points: number;
  rank: number | null;
  rank_sort: number | null;
  overall_rank: number;
  percentile_rank: number | null;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface FplHistoryPastRow {
  season_name: string;
  total_points: number;
  rank: number;
}

export interface FplChipPlayed {
  name: string;
  time: string;
  event: number;
}

export interface FplHistory {
  current: FplHistoryCurrentRow[];
  past: FplHistoryPastRow[];
  chips: FplChipPlayed[];
}

export interface FplPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}

export interface FplAutomaticSub {
  entry: number;
  element_in: number;
  element_out: number;
  event: number;
}

export interface FplPicks {
  active_chip: string | null;
  automatic_subs: FplAutomaticSub[];
  entry_history: FplHistoryCurrentRow;
  picks: FplPick[];
}

export interface FplTransfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

export interface FplLeagueStandingResult {
  entry: number;
  entry_name: string;
  player_name: string;
  event_total: number;
  total: number;
  rank: number;
  rank_sort: number;
  last_rank: number;
}

export interface FplLeagueStandings {
  league: {
    id: number;
    name: string;
  };
  standings: {
    has_next: boolean;
    page: number;
    results: FplLeagueStandingResult[];
  };
}

export interface FplEventStatusRow {
  bonus_added: boolean;
  date: string;
  event: number;
  points: string;
}

export interface FplEventStatus {
  status: FplEventStatusRow[];
  leagues: string;
}

export interface FplElementSummary {
  fixtures: unknown[];
  history: unknown[];
  history_past: unknown[];
}
