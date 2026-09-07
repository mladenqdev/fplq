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
  past: PlannerPlan[];
  future: PlannerPlan[];
  undo: () => void;
  redo: () => void;
  // Seed from a fresh squad. Reseeds if the entry or base GW changed (new GW rolled over).
  sync: (entryId: number, baseEvent: number, horizon?: number) => void;
  addTransfer: (event: number, transfer: PlannerTransfer) => void;
  removeTransfer: (event: number, index: number) => void;
  setChip: (event: number, chip: ChipName | null) => void;
  reset: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  plan: null,
  past: [],
  future: [],
  undo: () => {
    const { plan, past, future } = get();
    const previous = past.at(-1);
    if (!plan || !previous) return;
    persist(previous);
    set({ plan: previous, past: past.slice(0, -1), future: [plan, ...future] });
  },
  redo: () => {
    const { plan, past, future } = get();
    const next = future[0];
    if (!plan || !next) return;
    persist(next);
    set({ plan: next, past: [...past, plan].slice(-50), future: future.slice(1) });
  },
  sync: (entryId, baseEvent, horizon = DEFAULT_HORIZON) => {
    const current = get().plan;
    if (current && current.entryId === entryId && current.baseEvent === baseEvent) return;
    const stored = loadStored(entryId);
    if (stored && stored.baseEvent === baseEvent) {
      set({ plan: stored, past: [], future: [] });
      return;
    }
    const fresh = emptyPlan(entryId, baseEvent, horizon);
    persist(fresh);
    set({ plan: fresh, past: [], future: [] });
  },
  addTransfer: (event, transfer) => {
    const plan = get().plan;
    if (!plan) return;
    const next = addTransferPure(plan, event, transfer);
    persist(next);
    set({ plan: next, past: [...get().past, plan].slice(-50), future: [] });
  },
  removeTransfer: (event, index) => {
    const plan = get().plan;
    if (!plan) return;
    const next = removeTransferPure(plan, event, index);
    persist(next);
    set({ plan: next, past: [...get().past, plan].slice(-50), future: [] });
  },
  setChip: (event, chip) => {
    const plan = get().plan;
    if (!plan) return;
    const next = setChipPure(plan, event, chip);
    persist(next);
    set({ plan: next, past: [...get().past, plan].slice(-50), future: [] });
  },
  reset: () => {
    const plan = get().plan;
    if (!plan) return;
    const fresh = emptyPlan(plan.entryId, plan.baseEvent, plan.horizon);
    persist(fresh);
    set({ plan: fresh, past: [...get().past, plan].slice(-50), future: [] });
  },
}));
