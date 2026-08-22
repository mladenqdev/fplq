// Rule 3.3: projected auto subs. Rule 3.4: effective captain.
// Produces the effective multiplier per element used by live points (rule 3.5).

import type { FixtureStateName } from './dto';
import { didNotPlay } from './fixture-state';

export const GKP = 1;
export const DEF = 2;
export const MID = 3;
export const FWD = 4;

export interface AutoSubPick {
  element: number;
  position: number; // 1..15
  multiplier: number; // FPL multiplier: captain 2 (3 with 3xc), others 1, bench 0
  isCaptain: boolean;
  isViceCaptain: boolean;
  elementType: number;
}

export interface PlayInfo {
  minutes: number;
  state: FixtureStateName;
}

export type PlayLookup = (element: number) => PlayInfo;

export interface AutoSubResult {
  subs: { in: number; out: number }[];
  startingXi: number[];
  captain: number | null;
  effectiveMultiplier: Map<number, number>;
}

function played(info: PlayInfo): boolean {
  return info.minutes > 0;
}

function dnp(info: PlayInfo): boolean {
  return didNotPlay(info.state, info.minutes);
}

// Rule 3.4: reassign captaincy to the vice if the captain did not play and the vice
// still can (played, or their fixture is not finished). Returns the element that
// receives the captain multiplier, or null if neither plays.
function effectiveCaptain(picks: AutoSubPick[], play: PlayLookup): number | null {
  const captain = picks.find((p) => p.isCaptain);
  if (!captain) return null;
  if (!dnp(play(captain.element))) return captain.element;
  const vice = picks.find((p) => p.isViceCaptain);
  if (!vice) return null;
  const viceInfo = play(vice.element);
  const viceEligible = !dnp(viceInfo) && viceInfo.state !== 'blank';
  return viceEligible ? vice.element : null;
}

function validXi(types: number[]): boolean {
  const gk = types.filter((t) => t === GKP).length;
  const def = types.filter((t) => t === DEF).length;
  const mid = types.filter((t) => t === MID).length;
  const fwd = types.filter((t) => t === FWD).length;
  return (
    types.length === 11 &&
    gk === 1 &&
    def >= 3 &&
    def <= 5 &&
    mid >= 2 &&
    mid <= 5 &&
    fwd >= 1 &&
    fwd <= 3
  );
}

export function projectAutoSubs(
  picks: AutoSubPick[],
  play: PlayLookup,
  activeChip: string | null
): AutoSubResult {
  const byPosition = [...picks].sort((a, b) => a.position - b.position);
  const captain = effectiveCaptain(picks, play);
  const captainMultiplier = activeChip === '3xc' ? 3 : 2;

  // Rule 3.3: bench boost skips auto subs entirely; all 15 count with multiplier >= 1.
  if (activeChip === 'bboost') {
    const effectiveMultiplier = new Map<number, number>();
    for (const p of byPosition) {
      effectiveMultiplier.set(p.element, p.element === captain ? captainMultiplier : 1);
    }
    return {
      subs: [],
      startingXi: byPosition.map((p) => p.element),
      captain,
      effectiveMultiplier,
    };
  }

  const starters = byPosition.filter((p) => p.position <= 11);
  const bench = byPosition.filter((p) => p.position >= 12);
  const benchGk = bench.find((p) => p.position === 12);
  const benchOutfield = bench.filter((p) => p.position >= 13);

  const xi = new Map<number, AutoSubPick>();
  for (const p of starters) xi.set(p.element, p);
  const subs: { in: number; out: number }[] = [];

  // GK swap: only the bench GK can replace the starting GK.
  const startingGk = starters.find((p) => p.elementType === GKP);
  if (startingGk && benchGk && dnp(play(startingGk.element)) && played(play(benchGk.element))) {
    xi.delete(startingGk.element);
    xi.set(benchGk.element, benchGk);
    subs.push({ in: benchGk.element, out: startingGk.element });
  }

  // Outfield: each bench outfielder (in order) who played replaces the first
  // still-in-XI starter (position order) who did not play, if the XI stays valid.
  for (const inPick of benchOutfield) {
    if (!played(play(inPick.element))) continue;
    const candidates = [...xi.values()]
      .filter((p) => p.elementType !== GKP && dnp(play(p.element)))
      .sort((a, b) => a.position - b.position);
    for (const outPick of candidates) {
      const nextTypes = [...xi.values()]
        .filter((p) => p.element !== outPick.element)
        .map((p) => p.elementType)
        .concat(inPick.elementType);
      if (validXi(nextTypes)) {
        xi.delete(outPick.element);
        xi.set(inPick.element, inPick);
        subs.push({ in: inPick.element, out: outPick.element });
        break;
      }
    }
  }

  const startingXi = [...xi.keys()];
  const inXi = new Set(startingXi);
  const effectiveMultiplier = new Map<number, number>();
  for (const p of byPosition) {
    if (!inXi.has(p.element)) {
      effectiveMultiplier.set(p.element, 0);
      continue;
    }
    effectiveMultiplier.set(p.element, p.element === captain ? captainMultiplier : 1);
  }

  return { subs, startingXi, captain, effectiveMultiplier };
}
