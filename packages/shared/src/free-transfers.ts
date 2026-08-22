// Rule 3.6: free transfers.
// The entry's first GW is unlimited (represented as null). ft(first+1) = 1. Then each
// GW rolls forward: wildcard/freehit played in the previous GW adds one without
// consuming; otherwise ft = min(cap, max(prev - transfersMade, 0) + 1).

export const DEFAULT_MAX_FREE_TRANSFERS = 5;

// Forward projection used by both the history derivation and the planner (rule 3.8).
export function projectNextFt(
  current: number,
  transfersMade: number,
  chipUsed: boolean,
  maxFt: number = DEFAULT_MAX_FREE_TRANSFERS
): number {
  if (chipUsed) return Math.min(maxFt, current + 1);
  return Math.min(maxFt, Math.max(current - transfersMade, 0) + 1);
}

export interface FtHistoryRow {
  event: number;
  transfers: number;
}

export interface FtInput {
  startedEvent: number;
  history: FtHistoryRow[]; // one row per played event
  chipEvents: { name: string; event: number }[]; // wildcard/freehit usage
  maxFt?: number;
}

const TRANSFER_CHIPS = new Set(['wildcard', 'freehit']);

// Available free transfers for every event from the first GW through the GW after the
// last played one. `null` marks the unlimited first GW.
export function freeTransfersByEvent(input: FtInput): Map<number, number | null> {
  const maxFt = input.maxFt ?? DEFAULT_MAX_FREE_TRANSFERS;
  const transfersByEvent = new Map<number, number>();
  for (const row of input.history) transfersByEvent.set(row.event, row.transfers);
  const chipByEvent = new Map<number, string>();
  for (const chip of input.chipEvents) chipByEvent.set(chip.event, chip.name);

  const result = new Map<number, number | null>();
  const first = input.startedEvent;
  result.set(first, null);

  const lastPlayed = input.history.reduce((max, row) => Math.max(max, row.event), first);
  const lastEvent = Math.max(lastPlayed + 1, first + 1);

  let current = 1; // ft available at first + 1
  for (let event = first + 1; event <= lastEvent; event++) {
    result.set(event, current);
    const chip = chipByEvent.get(event);
    const chipUsed = chip !== undefined && TRANSFER_CHIPS.has(chip);
    const made = transfersByEvent.get(event) ?? 0;
    current = projectNextFt(current, made, chipUsed, maxFt);
  }
  return result;
}

export function freeTransfersForEvent(input: FtInput, event: number): number {
  const map = freeTransfersByEvent(input);
  const value = map.get(event);
  if (value === null || value === undefined) {
    // Requested before/at the unlimited first GW, or beyond history: fall back to 1.
    return event <= input.startedEvent ? (input.maxFt ?? DEFAULT_MAX_FREE_TRANSFERS) : 1;
  }
  return value;
}
