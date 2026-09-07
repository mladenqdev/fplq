import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlannerStore } from '../src/stores/usePlanner';

beforeEach(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  usePlannerStore.setState({ plan: null, past: [], future: [] });
  usePlannerStore.getState().sync(1, 3);
});

describe('planner undo and redo', () => {
  it('restores the complete plan, including chip choices and reverted transfers', () => {
    const state = () => usePlannerStore.getState();
    state().addTransfer(4, { out: 1, in: 2 });
    state().setChip(4, 'wildcard');
    state().removeTransfer(4, 0);
    state().undo();
    expect(state().plan!.gameweeks[4]).toEqual({
      chip: 'wildcard',
      transfers: [{ out: 1, in: 2 }],
    });
    state().undo();
    expect(state().plan!.gameweeks[4]!.chip).toBeNull();
    state().redo();
    expect(state().plan!.gameweeks[4]!.chip).toBe('wildcard');
    expect(localStorage.setItem).toHaveBeenLastCalledWith(
      'fplq.plan.1',
      JSON.stringify(state().plan)
    );
  });
  it('lets reset be undone, and discards redo after a new change', () => {
    const state = () => usePlannerStore.getState();
    state().addTransfer(4, { out: 1, in: 2 });
    state().reset();
    expect(state().plan!.gameweeks[4]!.transfers).toEqual([]);
    state().undo();
    expect(state().plan!.gameweeks[4]!.transfers).toHaveLength(1);
    state().setChip(4, 'bboost');
    expect(state().future).toEqual([]);
  });
});
