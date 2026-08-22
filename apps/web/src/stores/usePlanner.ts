import { create } from 'zustand';
import {
  addTransfer as addTransferPure,
  removeTransfer as removeTransferPure,
  setChip as setChipPure,
  emptyPlan,
  DEFAULT_HORIZON,
  type ChipName,
  type PlannerPlan,
  type PlannerTransfer,
} from '@fplq/shared';

const planKey = (entryId: number) => `fplq.plan.${entryId}`;

function loadStored(entryId: number): PlannerPlan | null {
  try {
    const raw = localStorage.getItem(planKey(entryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerPlan;
    if (parsed && typeof parsed.baseEvent === 'number' && parsed.gameweeks) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist(plan: PlannerPlan): void {
  try {
    localStorage.setItem(planKey(plan.entryId), JSON.stringify(plan));
  } catch {
    // ignore storage failures
  }
}

interface PlannerState {
  plan: PlannerPlan | null;
  // Seed from a fresh squad. Reseeds if the entry or base GW changed (new GW rolled over).
  sync: (entryId: number, baseEvent: number, horizon?: number) => void;
  addTransfer: (event: number, transfer: PlannerTransfer) => void;
  removeTransfer: (event: number, index: number) => void;
  setChip: (event: number, chip: ChipName | null) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  plan: null,
  sync: (entryId, baseEvent, horizon = DEFAULT_HORIZON) => {
    const current = get().plan;
    if (current && current.entryId === entryId && current.baseEvent === baseEvent) return;
    const stored = loadStored(entryId);
    if (stored && stored.baseEvent === baseEvent) {
      set({ plan: stored });
      return;
    }
    const fresh = emptyPlan(entryId, baseEvent, horizon);
    persist(fresh);
    set({ plan: fresh });
  },
  addTransfer: (event, transfer) => {
    const plan = get().plan;
    if (!plan) return;
    const next = addTransferPure(plan, event, transfer);
    persist(next);
    set({ plan: next });
  },
  removeTransfer: (event, index) => {
    const plan = get().plan;
    if (!plan) return;
    const next = removeTransferPure(plan, event, index);
    persist(next);
    set({ plan: next });
  },
  setChip: (event, chip) => {
    const plan = get().plan;
    if (!plan) return;
    const next = setChipPure(plan, event, chip);
    persist(next);
    set({ plan: next });
  },
  reset: () => {
    const plan = get().plan;
    if (!plan) return;
    const fresh = emptyPlan(plan.entryId, plan.baseEvent, plan.horizon);
    persist(fresh);
    set({ plan: fresh });
  },
}));
