import { describe, it, expect } from 'vitest';
import {
  projectNextFt,
  freeTransfersByEvent,
  freeTransfersForEvent,
  type FtInput,
} from '../src/index';
import { history } from './helpers';

describe('projectNextFt (rule 3.6 forward roll)', () => {
  it('banks an unused transfer (+1)', () => {
    expect(projectNextFt(1, 0, false)).toBe(2);
  });
  it('spends the free transfer made', () => {
    expect(projectNextFt(1, 1, false)).toBe(1);
  });
  it('never drops below 1 after taking hits', () => {
    expect(projectNextFt(2, 5, false)).toBe(1);
  });
  it('caps at the maximum bank of 5', () => {
    expect(projectNextFt(5, 0, false)).toBe(5);
  });
  it('a transfer chip adds one without consuming', () => {
    expect(projectNextFt(2, 5, true)).toBe(3);
  });
});

describe('freeTransfersByEvent (rule 3.6)', () => {
  it('first GW is unlimited (null) and the next is 1', () => {
    const input: FtInput = {
      startedEvent: 1,
      history: [{ event: 1, transfers: 0 }],
      chipEvents: [],
    };
    const map = freeTransfersByEvent(input);
    expect(map.get(1)).toBeNull();
    expect(map.get(2)).toBe(1);
  });

  it('rolls a transfer chip forward (+1) and consumes normal transfers', () => {
    const input: FtInput = {
      startedEvent: 1,
      history: [
        { event: 1, transfers: 0 },
        { event: 2, transfers: 2 },
        { event: 3, transfers: 0 },
        { event: 4, transfers: 1 },
      ],
      chipEvents: [{ name: 'wildcard', event: 3 }],
    };
    const map = freeTransfersByEvent(input);
    expect(map.get(2)).toBe(1); // 1 available, made 2 (a hit)
    expect(map.get(3)).toBe(1); // still 1, wildcard week
    expect(map.get(4)).toBe(2); // wildcard banked +1
    expect(map.get(5)).toBe(2);
  });

  it('banks up to the cap of 5 over quiet gameweeks', () => {
    const input: FtInput = {
      startedEvent: 1,
      history: Array.from({ length: 7 }, (_, i) => ({ event: i + 1, transfers: 0 })),
      chipEvents: [],
    };
    const map = freeTransfersByEvent(input);
    expect(map.get(5)).toBe(4);
    expect(map.get(6)).toBe(5);
    expect(map.get(7)).toBe(5);
    expect(map.get(8)).toBe(5);
  });

  it('a late joiner starts unlimited at their first GW then 1 the next', () => {
    const input: FtInput = {
      startedEvent: 5,
      history: [{ event: 5, transfers: 0 }],
      chipEvents: [],
    };
    const map = freeTransfersByEvent(input);
    expect(map.get(5)).toBeNull();
    expect(map.get(6)).toBe(1);
  });

  it('derives 1 free transfer for GW2 from the real GW1 history', () => {
    const input: FtInput = {
      startedEvent: 1,
      history: history.current.map((row) => ({ event: row.event, transfers: row.event_transfers })),
      chipEvents: history.chips.map((c) => ({ name: c.name, event: c.event })),
    };
    expect(freeTransfersForEvent(input, 2)).toBe(1);
  });
});
