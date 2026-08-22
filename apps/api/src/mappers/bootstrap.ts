import type {
  FplBootstrap,
  FplEvent,
  FplTeam,
  FplElementType,
  FplElement,
  FplChip,
  BootstrapDto,
  EventDto,
  TeamDto,
  ElementTypeDto,
  ElementDto,
  ChipDto,
} from '@fplq/shared';
import { num } from './parse';

export function mapEvent(e: FplEvent): EventDto {
  return {
    id: e.id,
    name: e.name,
    deadlineTime: e.deadline_time,
    finished: e.finished,
    dataChecked: e.data_checked,
    isCurrent: e.is_current,
    isNext: e.is_next,
    isPrevious: e.is_previous,
    averageEntryScore: e.average_entry_score,
    highestScore: e.highest_score,
    rankedCount: e.ranked_count,
    chipPlays: e.chip_plays.map((c) => ({ chipName: c.chip_name, numPlayed: c.num_played })),
    mostCaptained: e.most_captained,
    mostSelected: e.most_selected,
  };
}

export function mapTeam(t: FplTeam): TeamDto {
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    shortName: t.short_name,
    strengthOverallHome: t.strength_overall_home,
    strengthOverallAway: t.strength_overall_away,
    strengthAttackHome: t.strength_attack_home,
    strengthAttackAway: t.strength_attack_away,
    strengthDefenceHome: t.strength_defence_home,
    strengthDefenceAway: t.strength_defence_away,
  };
}

export function mapElementType(t: FplElementType): ElementTypeDto {
  return {
    id: t.id,
    singularName: t.singular_name,
    singularNameShort: t.singular_name_short,
    pluralName: t.plural_name,
    pluralNameShort: t.plural_name_short,
    squadSelect: t.squad_select,
    squadMinPlay: t.squad_min_play,
    squadMaxPlay: t.squad_max_play,
  };
}

export function mapElement(e: FplElement): ElementDto {
  return {
    id: e.id,
    code: e.code,
    webName: e.web_name,
    firstName: e.first_name,
    secondName: e.second_name,
    team: e.team,
    elementType: e.element_type,
    nowCost: e.now_cost,
    costChangeStart: e.cost_change_start,
    costChangeEvent: e.cost_change_event,
    status: e.status,
    news: e.news,
    newsAdded: e.news_added,
    chanceOfPlayingNextRound: e.chance_of_playing_next_round,
    selectedByPercent: num(e.selected_by_percent),
    totalPoints: e.total_points,
    eventPoints: e.event_points,
    form: num(e.form),
    pointsPerGame: num(e.points_per_game),
    minutes: e.minutes,
    starts: e.starts,
    goalsScored: e.goals_scored,
    assists: e.assists,
    cleanSheets: e.clean_sheets,
    goalsConceded: e.goals_conceded,
    bonus: e.bonus,
    bps: e.bps,
    yellowCards: e.yellow_cards,
    redCards: e.red_cards,
    saves: e.saves,
    defensiveContribution: e.defensive_contribution,
    ictIndex: num(e.ict_index),
    xg: num(e.expected_goals),
    xa: num(e.expected_assists),
    xgi: num(e.expected_goal_involvements),
    xgc: num(e.expected_goals_conceded),
    xg90: e.expected_goals_per_90,
    xa90: e.expected_assists_per_90,
    xgi90: e.expected_goal_involvements_per_90,
    xgc90: e.expected_goals_conceded_per_90,
    epNext: num(e.ep_next),
    epThis: num(e.ep_this),
    priceChangePercent: num(e.price_change_percent),
    priceChangeProjections: e.price_change_projections.map((p) => ({
      offset: p.offset,
      projectedPercent: num(p.projected_percent),
      likelihood: p.likelihood,
    })),
    transfersInEvent: e.transfers_in_event,
    transfersOutEvent: e.transfers_out_event,
    photo: e.photo,
    penaltiesOrder: e.penalties_order,
    cornersOrder: e.corners_and_indirect_freekicks_order,
    directFreekicksOrder: e.direct_freekicks_order,
    scoutRisks: e.scout_risks,
  };
}

export function mapChip(c: FplChip): ChipDto {
  return {
    id: c.id,
    name: c.name,
    startEvent: c.start_event,
    stopEvent: c.stop_event,
    chipType: c.chip_type,
  };
}

export function currentEventId(b: FplBootstrap): number | null {
  return b.events.find((e) => e.is_current)?.id ?? null;
}

export function nextEventId(b: FplBootstrap): number | null {
  return b.events.find((e) => e.is_next)?.id ?? null;
}

export function mapBootstrap(b: FplBootstrap, fetchedAt: string): BootstrapDto {
  return {
    fetchedAt,
    totalPlayers: b.total_players,
    currentEvent: currentEventId(b),
    nextEvent: nextEventId(b),
    events: b.events.map(mapEvent),
    teams: b.teams.map(mapTeam),
    elementTypes: b.element_types.map(mapElementType),
    elements: b.elements.map(mapElement),
    chips: b.chips.map(mapChip),
    rules: {
      squadTeamLimit: b.game_settings.squad_team_limit,
      squadTotalSpend: b.game_settings.squad_total_spend,
      maxFreeTransfers: 1 + b.game_settings.max_extra_free_transfers,
      transfersCap: b.game_settings.transfers_cap,
      sellOnFee: b.game_settings.transfers_sell_on_fee,
    },
    priceChangeDeadlines: b.game_config.settings.price_change_deadlines ?? [],
  };
}
