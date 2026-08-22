import { create } from 'zustand';

const KEY = 'fplq.entryId';

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export const DEFAULT_ENTRY_ID = Number(import.meta.env.VITE_DEFAULT_ENTRY_ID) || 0;

interface EntryIdState {
  entryId: number | null;
  setEntryId: (id: number) => void;
  clearEntryId: () => void;
}

export const useEntryIdStore = create<EntryIdState>((set) => ({
  entryId: readStored(),
  setEntryId: (id) => {
    try {
      localStorage.setItem(KEY, String(id));
    } catch {
      // ignore storage failures (private mode); state still updates for this session
    }
    set({ entryId: id });
  },
  clearEntryId: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    set({ entryId: null });
  },
}));

// Convenience for components that require a resolved id (routes are gated by first-run).
export function useEntryId(): number {
  const entryId = useEntryIdStore((s) => s.entryId);
  return entryId ?? DEFAULT_ENTRY_ID;
}
