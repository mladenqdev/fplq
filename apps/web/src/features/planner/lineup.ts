import type { ChipName, DerivedGameweekPlayer } from '@fplq/shared';

export interface LineupPlayer extends DerivedGameweekPlayer {
  proj: number;
}

export interface Lineup {
  rows: Record<number, LineupPlayer[]>;
  bench: LineupPlayer[];
  formation: string;
  xiElements: number[];
  captain: number | null;
}

export function projectedLineupTotal(
  lineup: Lineup,
  chip: ChipName | null,
  hitCost: number
): number {
  const starters = Object.values(lineup.rows).flat();
  const players = chip === 'bboost' ? [...starters, ...lineup.bench] : starters;
  const total = players.reduce((sum, player) => {
    const multiplier = player.element === lineup.captain ? (chip === '3xc' ? 3 : 2) : 1;
    return sum + player.proj * multiplier;
  }, 0);
  return Math.round((total - hitCost) * 10) / 10;
}

// Valid XI: exactly 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD, 11 total (season rules, ARCHITECTURE
// section 3). We field the strongest legal XI by projected points, so a player with a blank
// GW (0 projected) naturally drops to the bench.
const MAX_DEF = 5;
const MAX_MID = 5;
const MAX_FWD = 3;

export function buildLineup(
  players: DerivedGameweekPlayer[],
  projOf: (element: number) => number
): Lineup {
  const withProj: LineupPlayer[] = players.map((p) => ({ ...p, proj: projOf(p.element) }));
  const byType = (type: number) =>
    withProj.filter((p) => p.elementType === type).sort((a, b) => b.proj - a.proj);

  const gks = byType(1);
  const defs = byType(2);
  const mids = byType(3);
  const fwds = byType(4);

  const take = (arr: LineupPlayer[], n: number) => arr.slice(0, Math.min(n, arr.length));
  const xiGk = take(gks, 1);
  const xiDef = take(defs, 3);
  const xiMid = take(mids, 2);
  const xiFwd = take(fwds, 1);

  const extraDef: LineupPlayer[] = [];
  const extraMid: LineupPlayer[] = [];
  const extraFwd: LineupPlayer[] = [];
  const pool = [
    ...defs.slice(xiDef.length),
    ...mids.slice(xiMid.length),
    ...fwds.slice(xiFwd.length),
  ].sort((a, b) => b.proj - a.proj);

  let need = 11 - xiGk.length - xiDef.length - xiMid.length - xiFwd.length;
  for (const p of pool) {
    if (need <= 0) break;
    if (p.elementType === 2 && xiDef.length + extraDef.length < MAX_DEF) extraDef.push(p);
    else if (p.elementType === 3 && xiMid.length + extraMid.length < MAX_MID) extraMid.push(p);
    else if (p.elementType === 4 && xiFwd.length + extraFwd.length < MAX_FWD) extraFwd.push(p);
    else continue;
    need--;
  }

  const bySort = (a: LineupPlayer, b: LineupPlayer) => b.proj - a.proj;
  const rowDef = [...xiDef, ...extraDef].sort(bySort);
  const rowMid = [...xiMid, ...extraMid].sort(bySort);
  const rowFwd = [...xiFwd, ...extraFwd].sort(bySort);
  const rows: Record<number, LineupPlayer[]> = { 1: xiGk, 2: rowDef, 3: rowMid, 4: rowFwd };

  const xiPlayers = [...xiGk, ...rowDef, ...rowMid, ...rowFwd];
  const xiElements = xiPlayers.map((p) => p.element);
  const xiSet = new Set(xiElements);
  const bench = withProj
    .filter((p) => !xiSet.has(p.element))
    .sort(
      (a, b) => (a.elementType === 1 ? 0 : 1) - (b.elementType === 1 ? 0 : 1) || b.proj - a.proj
    );

  let captain: number | null = null;
  let best = 0;
  for (const p of xiPlayers) {
    if (p.proj > best) {
      best = p.proj;
      captain = p.element;
    }
  }

  return {
    rows,
    bench,
    formation: `${rowDef.length}-${rowMid.length}-${rowFwd.length}`,
    xiElements,
    captain,
  };
}

// Transfers inherit the original pitch/bench slot, regardless of their projection.
export function fillLineupSlots(
  reference: Lineup,
  players: LineupPlayer[],
  slots: Map<number, number>
): Lineup {
  const byId = new Map(players.map((p) => [p.element, p]));
  const fill = (row: LineupPlayer[]) =>
    row.flatMap((p) => {
      const replacement = byId.get(slots.get(p.element) ?? p.element);
      return replacement ? [replacement] : [];
    });
  const rows = Object.fromEntries(
    Object.entries(reference.rows).map(([type, row]) => [type, fill(row)])
  );
  const starters = Object.values(rows).flat();
  const captain =
    starters.reduce<LineupPlayer | null>(
      (best, p) => (!best || p.proj > best.proj ? p : best),
      null
    )?.element ?? null;
  return {
    rows,
    bench: fill(reference.bench),
    formation: reference.formation,
    xiElements: starters.map((p) => p.element),
    captain,
  };
}
