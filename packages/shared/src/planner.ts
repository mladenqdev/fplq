// Rule 3.8: the transfer planner. Pure functions only; the web app persists plans in
// localStorage under `fplq.plan.{entryId}`.

import { projectNextFt, DEFAULT_MAX_FREE_TRANSFERS } from './free-transfers';

export type ChipName = 'wildcard' | 'freehit' | 'bboost' | '3xc';

export interface PlannerTransfer {
  out: number;
  in: number;
}

export interface PlannerGameweek {
  transfers: PlannerTransfer[];
  chip: ChipName | null;
}

export interface PlannerPlan {
  entryId: number;
  baseEvent: number;
  horizon: number;
  gameweeks: Record<number, PlannerGameweek>;
  updatedAt: string;
}

export const DEFAULT_HORIZON = 5;

// Full-squad composition by element type (2 GKP, 5 DEF, 5 MID, 3 FWD).
const SQUAD_REQUIREMENTS: Record<number, number> = { 1: 2, 2: 5, 3: 5, 4: 3 };
const TYPE_LABEL: Record<number, string> = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };
const TRANSFER_CHIPS = new Set<ChipName>(['wildcard', 'freehit']);

function planEvents(baseEvent: number, horizon: number): number[] {
  return Array.from({ length: horizon }, (_, i) => baseEvent + 1 + i);
}

export function emptyPlan(
  entryId: number,
  baseEvent: number,
  horizon: number = DEFAULT_HORIZON,
  now: string = new Date().toISOString()
): PlannerPlan {
  const gameweeks: Record<number, PlannerGameweek> = {};
  for (const event of planEvents(baseEvent, horizon)) {
    gameweeks[event] = { transfers: [], chip: null };
  }
  return { entryId, baseEvent, horizon, gameweeks, updatedAt: now };
}

function cloneGameweeks(plan: PlannerPlan): Record<number, PlannerGameweek> {
  const out: Record<number, PlannerGameweek> = {};
  for (const [event, gw] of Object.entries(plan.gameweeks)) {
    out[Number(event)] = { transfers: gw.transfers.map((t) => ({ ...t })), chip: gw.chip };
  }
  return out;
}

function withGameweeks(
  plan: PlannerPlan,
  gameweeks: Record<number, PlannerGameweek>,
  now: string
): PlannerPlan {
  return { ...plan, gameweeks, updatedAt: now };
}

export function addTransfer(
  plan: PlannerPlan,
  event: number,
  transfer: PlannerTransfer,
  now: string = new Date().toISOString()
): PlannerPlan {
  const gameweeks = cloneGameweeks(plan);
  const gw = gameweeks[event] ?? { transfers: [], chip: null };
  gw.transfers = [...gw.transfers, { ...transfer }];
  gameweeks[event] = gw;
  return withGameweeks(plan, gameweeks, now);
}

export function removeTransfer(
  plan: PlannerPlan,
  event: number,
  index: number,
  now: string = new Date().toISOString()
): PlannerPlan {
  const gameweeks = cloneGameweeks(plan);
  const gw = gameweeks[event];
  if (gw) gw.transfers = gw.transfers.filter((_, i) => i !== index);
  return withGameweeks(plan, gameweeks, now);
}

export function setChip(
  plan: PlannerPlan,
  event: number,
  chip: ChipName | null,
  now: string = new Date().toISOString()
): PlannerPlan {
  const gameweeks = cloneGameweeks(plan);
  const gw = gameweeks[event] ?? { transfers: [], chip: null };
  gw.chip = chip;
  gameweeks[event] = gw;
  return withGameweeks(plan, gameweeks, now);
}

export interface PlannerFixture {
  id: number;
  opponent: number;
  isHome: boolean;
  difficulty: number;
}

export interface PlannerContext {
  startingSquad: number[];
  bank: number;
  freeTransfersAtStart: number;
  sellingPriceOf: (element: number) => number;
  nowCostOf: (element: number) => number;
  elementTypeOf: (element: number) => number;
  teamOf: (element: number) => number;
  fixturesFor: (team: number, event: number) => PlannerFixture[];
  isChipAvailable: (chip: ChipName, event: number) => boolean;
  maxFreeTransfers?: number;
  squadTeamLimit?: number;
}

export interface DerivedGameweekPlayer {
  element: number;
  elementType: number;
  team: number;
  sellingPrice: number;
  fixtures: PlannerFixture[];
}

export interface DerivedGameweek {
  event: number;
  chip: ChipName | null;
  squad: number[];
  bank: number;
  freeTransfers: number;
  transfersMade: number;
  hitCost: number;
  transfers: PlannerTransfer[];
  players: DerivedGameweekPlayer[];
  problems: string[];
}

export interface DerivedPlan {
  entryId: number;
  baseEvent: number;
  horizon: number;
  gameweeks: DerivedGameweek[];
}

interface WorkingState {
  squad: Set<number>;
  bank: number;
  sellPrice: Map<number, number>;
}

function applyTransfers(
  state: WorkingState,
  transfers: PlannerTransfer[],
  ctx: PlannerContext,
  problems: string[]
): void {
  for (const transfer of transfers) {
    if (!state.squad.has(transfer.out)) {
      problems.push(`Player ${transfer.out} is not in the squad to transfer out`);
    } else {
      state.bank += state.sellPrice.get(transfer.out) ?? ctx.sellingPriceOf(transfer.out);
      state.squad.delete(transfer.out);
    }
    if (state.squad.has(transfer.in)) {
      problems.push(`Player ${transfer.in} is already in the squad`);
    } else {
      state.bank -= ctx.nowCostOf(transfer.in);
      state.sellPrice.set(transfer.in, ctx.nowCostOf(transfer.in));
      state.squad.add(transfer.in);
    }
  }
}

function squadProblems(squad: Set<number>, ctx: PlannerContext, bank: number): string[] {
  const problems: string[] = [];
  const teamLimit = ctx.squadTeamLimit ?? 3;

  const byType = new Map<number, number>();
  const byTeam = new Map<number, number>();
  for (const element of squad) {
    const type = ctx.elementTypeOf(element);
    const team = ctx.teamOf(element);
    byType.set(type, (byType.get(type) ?? 0) + 1);
    byTeam.set(team, (byTeam.get(team) ?? 0) + 1);
  }
  for (const [type, required] of Object.entries(SQUAD_REQUIREMENTS)) {
    const have = byType.get(Number(type)) ?? 0;
    if (have !== required) {
      problems.push(`Squad must have ${required} ${TYPE_LABEL[Number(type)]} (has ${have})`);
    }
  }
  for (const [team, count] of byTeam) {
    if (count > teamLimit) {
      problems.push(`More than ${teamLimit} players from team ${team}`);
    }
  }
  if (bank < 0) problems.push('Negative bank');
  return problems;
}

function playersFor(
  squad: Set<number>,
  event: number,
  ctx: PlannerContext,
  sellPrice: Map<number, number>
): DerivedGameweekPlayer[] {
  return [...squad].map((element) => {
    const team = ctx.teamOf(element);
    return {
      element,
      elementType: ctx.elementTypeOf(element),
      team,
      sellingPrice: sellPrice.get(element) ?? ctx.sellingPriceOf(element),
      fixtures: ctx.fixturesFor(team, event),
    };
  });
}

export function derivePlan(plan: PlannerPlan, ctx: PlannerContext): DerivedPlan {
  const maxFt = ctx.maxFreeTransfers ?? DEFAULT_MAX_FREE_TRANSFERS;
  const state: WorkingState = {
    squad: new Set(ctx.startingSquad),
    bank: ctx.bank,
    sellPrice: new Map(ctx.startingSquad.map((el) => [el, ctx.sellingPriceOf(el)])),
  };
  let freeTransfers = ctx.freeTransfersAtStart;
  const chipUsage = new Map<ChipName, number>();

  const gameweeks: DerivedGameweek[] = [];
  for (const event of planEvents(plan.baseEvent, plan.horizon)) {
    const planned = plan.gameweeks[event] ?? { transfers: [], chip: null };
    const chip = planned.chip;
    const transfers = planned.transfers;
    const transfersMade = transfers.length;
    const problems: string[] = [];

    if (chip) {
      chipUsage.set(chip, (chipUsage.get(chip) ?? 0) + 1);
      if (chipUsage.get(chip)! > 1) problems.push(`Chip ${chip} used more than once in the plan`);
      if (!ctx.isChipAvailable(chip, event)) {
        problems.push(`Chip ${chip} is not available in GW ${event}`);
      }
    }

    const isFreeHit = chip === 'freehit';
    const isWildcard = chip === 'wildcard';
    const hitCost = isFreeHit || isWildcard ? 0 : Math.max(0, transfersMade - freeTransfers) * 4;

    let squad: number[];
    let bank: number;
    let players: DerivedGameweekPlayer[];

    if (isFreeHit) {
      // Free hit fields a one-off squad, then reverts next GW (rule 3.8).
      const scratch: WorkingState = {
        squad: new Set(state.squad),
        bank: state.bank,
        sellPrice: new Map(state.sellPrice),
      };
      applyTransfers(scratch, transfers, ctx, problems);
      problems.push(...squadProblems(scratch.squad, ctx, scratch.bank));
      squad = [...scratch.squad];
      bank = scratch.bank;
      players = playersFor(scratch.squad, event, ctx, scratch.sellPrice);
    } else {
      applyTransfers(state, transfers, ctx, problems);
      problems.push(...squadProblems(state.squad, ctx, state.bank));
      squad = [...state.squad];
      bank = state.bank;
      players = playersFor(state.squad, event, ctx, state.sellPrice);
    }

    gameweeks.push({
      event,
      chip,
      squad,
      bank,
      freeTransfers,
      transfersMade,
      hitCost,
      transfers: transfers.map((t) => ({ ...t })),
      players,
      problems,
    });

    const chipUsed = chip !== null && TRANSFER_CHIPS.has(chip);
    freeTransfers = projectNextFt(freeTransfers, transfersMade, chipUsed, maxFt);
  }

  return { entryId: plan.entryId, baseEvent: plan.baseEvent, horizon: plan.horizon, gameweeks };
}
