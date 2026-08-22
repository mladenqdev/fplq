// Our API DTOs. These are the exact shapes the web app consumes; the API mappers
// build them from the raw FPL types. Numeric strings from FPL are parsed to numbers
// here. See ARCHITECTURE.md section 4.

import type { FplLiveStats, FplExplain } from './fpl-types';

export interface EventDto {
  id: number;
  name: string;
  deadlineTime: string;
  finished: boolean;
  dataChecked: boolean;
  isCurrent: boolean;
  isNext: boolean;
  isPrevious: boolean;
  averageEntryScore: number;
  highestScore: number | null;
  rankedCount: number;
  chipPlays: { chipName: string; numPlayed: number }[];
  mostCaptained: number | null;
  mostSelected: number | null;
}

export interface TeamDto {
  id: number;
  code: number;
  name: string;
  shortName: string;
  strengthOverallHome: number;
  strengthOverallAway: number;
  strengthAttackHome: number;
  strengthAttackAway: number;
  strengthDefenceHome: number;
  strengthDefenceAway: number;
}

export interface ElementTypeDto {
  id: number;
  singularName: string;
  singularNameShort: string;
  pluralName: string;
  pluralNameShort: string;
  squadSelect: number;
  squadMinPlay: number;
  squadMaxPlay: number;
}

export interface PriceChangeProjectionDto {
  offset: number;
  projectedPercent: number;
  likelihood: number;
}

export interface ElementDto {
  id: number;
  code: number;
  webName: string;
  firstName: string;
  secondName: string;
  team: number;
  elementType: number;
  nowCost: number;
  costChangeStart: number;
  costChangeEvent: number;
  status: string;
  news: string;
  newsAdded: string | null;
  chanceOfPlayingNextRound: number | null;
  selectedByPercent: number;
  totalPoints: number;
  eventPoints: number;
  form: number;
  pointsPerGame: number;
  minutes: number;
  starts: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  goalsConceded: number;
  bonus: number;
  bps: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  defensiveContribution: number;
  ictIndex: number;
  xg: number;
  xa: number;
  xgi: number;
  xgc: number;
  xg90: number;
  xa90: number;
  xgi90: number;
  xgc90: number;
  epNext: number;
  epThis: number;
  priceChangePercent: number;
  priceChangeProjections: PriceChangeProjectionDto[];
  transfersInEvent: number;
  transfersOutEvent: number;
  photo: string;
  penaltiesOrder: number | null;
  cornersOrder: number | null;
  directFreekicksOrder: number | null;
  scoutRisks: unknown[];
}

export interface ChipDto {
  id: number;
  name: string;
  startEvent: number;
  stopEvent: number;
  chipType: string;
}

export interface BootstrapDto {
  fetchedAt: string;
  totalPlayers: number;
  currentEvent: number | null;
  nextEvent: number | null;
  events: EventDto[];
  teams: TeamDto[];
  elementTypes: ElementTypeDto[];
  elements: ElementDto[];
  chips: ChipDto[];
  rules: {
    squadTeamLimit: number;
    squadTotalSpend: number;
    maxFreeTransfers: number;
    transfersCap: number;
    sellOnFee: number;
  };
  priceChangeDeadlines: string[];
}

export interface FixtureStatDto {
  identifier: string;
  h: { element: number; value: number }[];
  a: { element: number; value: number }[];
}

export interface FixtureDto {
  id: number;
  code: number;
  event: number | null;
  kickoffTime: string | null;
  started: boolean;
  finished: boolean;
  finishedProvisional: boolean;
  minutes: number;
  teamH: number;
  teamA: number;
  teamHScore: number | null;
  teamAScore: number | null;
  teamHDifficulty: number;
  teamADifficulty: number;
  stats?: FixtureStatDto[];
  provisionalBonus?: { element: number; bonus: number }[];
}

export interface LiveElementDto {
  id: number;
  stats: FplLiveStats;
  explain: FplExplain[];
}

export interface EntryLeagueDto {
  id: number;
  name: string;
  entryRank: number;
  entryLastRank: number;
  rankCount: number;
  leagueType: string;
}

export interface EntryDto {
  id: number;
  name: string;
  playerName: string;
  regionName: string;
  currentEvent: number | null;
  startedEvent: number;
  overallPoints: number;
  overallRank: number;
  eventPoints: number;
  eventRank: number | null;
  lastDeadlineBank: number | null;
  lastDeadlineValue: number | null;
  lastDeadlineTotalTransfers: number;
  leagues: EntryLeagueDto[];
  fetchedAt: string;
}

export type FixtureStateName = 'not_started' | 'live' | 'finished' | 'blank';

export interface EntryLivePickFixtureDto {
  id: number;
  opponent: number;
  isHome: boolean;
  started: boolean;
  finishedProvisional: boolean;
  minutes: number;
  kickoffTime: string | null;
  score: string | null;
}

export interface EntryLivePickDto {
  element: number;
  position: number;
  multiplier: number;
  effectiveMultiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  webName: string;
  team: number;
  elementType: number;
  nowCost: number;
  photo: string;
  points: number;
  officialPoints: number;
  provisionalBonus: number;
  bonusConfirmed: boolean;
  bps: number;
  minutes: number;
  fixtureState: FixtureStateName;
  fixtures: EntryLivePickFixtureDto[];
  explain: { identifier: string; points: number; value: number }[];
  subbedIn: boolean;
  subbedOut: boolean;
}

export interface EntryLiveDto {
  fetchedAt: string;
  event: number;
  entry: EntryDto;
  isLive: boolean;
  gwFinished: boolean;
  official: {
    eventPoints: number;
    overallRank: number;
    eventRank: number | null;
    overallPoints: number;
  };
  previous: {
    overallRank: number | null;
    overallPoints: number | null;
  };
  activeChip: string | null;
  transfersCost: number;
  pointsOnBench: number;
  computedPoints: number;
  picks: EntryLivePickDto[];
  autoSubs: { in: number; out: number; official: boolean }[];
}

export interface SquadPlayerDto {
  element: number;
  position: number;
  purchasePrice: number;
  sellingPrice: number;
  nowCost: number;
}

export interface SquadDto {
  fetchedAt: string;
  entryId: number;
  baseEvent: number;
  nextEvent: number;
  bank: number;
  freeTransfers: number;
  chipsUsed: { name: string; event: number }[];
  players: SquadPlayerDto[];
  activeChipBase: string | null;
}

export interface RankSampleDto {
  t: string;
  overallRank: number;
  overallPoints: number;
  eventPoints: number;
  eventRank: number | null;
}

export interface RankHistoryDto {
  samples: RankSampleDto[];
}

export interface LadderRungDto {
  rank: number;
  total: number;
  eventTotal: number;
}

export interface LadderDto {
  event: number | null;
  fetchedAt: string;
  rungs: LadderRungDto[];
}

// Free transfers derived per GW (rule 3.6). `available` is null for the entry's
// first GW, which allows unlimited transfers.
export interface FreeTransferDto {
  event: number;
  available: number | null;
}

export interface HistoryDto {
  current: import('./fpl-types').FplHistoryCurrentRow[];
  past: import('./fpl-types').FplHistoryPastRow[];
  chips: import('./fpl-types').FplChipPlayed[];
  freeTransfers: FreeTransferDto[];
}
