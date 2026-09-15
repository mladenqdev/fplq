import {
  addTransfer,
  derivePlan,
  type ElementDto,
  type PlannerContext,
  type PlannerPlan,
  type RecentMatch,
  type RecentPlayersDto,
} from '@fplq/shared';
import { buildLineup, projectedLineupTotal } from './lineup';

const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export interface PlayerEvidence {
  minutes: number;
  appearance: number;
  sixty: number;
  xg90: number;
  xa90: number;
  xgc90: number;
  dcPoints: number;
  dcHits: number;
  games: number;
  recentMinutes: number[];
  reliable: boolean;
}

/** Shrink small attacking samples toward the current season's position average.
 * 450 prior minutes and all decision margins are product heuristics, not fitted parameters.
 */
export function playerEvidence(
  player: ElementDto,
  matches: RecentMatch[],
  peers: ElementDto[]
): PlayerEvidence {
  const recent = matches.slice(-6);
  const weights = recent.map((_, i) => i + 1);
  const denominator = sum(weights) || 1;
  const weighted = (f: (m: RecentMatch) => number) =>
    sum(recent.map((m, i) => f(m) * weights[i]!)) / denominator;
  const cohort = peers.filter((p) => p.elementType === player.elementType && p.minutes >= 180);
  const peerMinutes = sum(cohort.map((p) => p.minutes));
  const priorRate = (key: 'xg' | 'xa') =>
    peerMinutes ? (sum(cohort.map((p) => p[key])) * 90) / peerMinutes : 0;
  const rate = (key: 'xg' | 'xa') =>
    (player[key] * 90 + priorRate(key) * 450) / (player.minutes + 450);
  return {
    minutes: weighted((m) => m.minutes),
    appearance: weighted((m) => Number(m.minutes > 0)),
    sixty: weighted((m) => Number(m.minutes >= 60)),
    xg90: rate('xg'),
    xa90: rate('xa'),
    // Player on-pitch xGC is a proxy for defence, regressed toward 1.4 goals/90.
    xgc90: (player.xgc * 90 + 1.4 * 450) / (player.minutes + 450),
    dcPoints: sum(recent.map((m) => clamp(m.defconPoints, 0, 2))) / (recent.length + 2),
    dcHits: recent.filter((m) => m.defconPoints > 0).length,
    games: recent.length,
    recentMinutes: recent.map((m) => m.minutes),
    reliable:
      recent.length >= 3 &&
      player.minutes >= 270 &&
      recent.slice(-3).filter((m) => m.minutes >= 60).length >= 2 &&
      weighted((m) => m.minutes) >= 60,
  };
}

export function estimateFixture(
  player: ElementDto,
  evidence: PlayerEvidence,
  difficulty: number,
  applyAvailability: boolean
): number {
  if (!evidence.games) return 0;
  const attack = clamp(1 + (3 - difficulty) * 0.12, 0.76, 1.24);
  const conceded = evidence.xgc90 / attack;
  const cleanSheet = Math.exp(-conceded) * evidence.sixty;
  const goalPoints = [0, 10, 6, 5, 4][player.elementType] ?? 4;
  const csPoints = [0, 4, 4, 1, 0][player.elementType] ?? 0;
  const attacking =
    (((evidence.xg90 * goalPoints + evidence.xa90 * 3) * evidence.minutes) / 90) * attack;
  const bonus =
    (Math.min(0.7, (player.bonus * 90) / (player.minutes + 450)) * evidence.minutes) / 90;
  const saves =
    player.elementType === 1
      ? (((player.saves * 30) / (player.minutes + 450)) * evidence.minutes) / 90
      : 0;
  const cards = (((player.yellowCards * 90) / (player.minutes + 450)) * evidence.minutes) / 90;
  // E[floor(goals conceded / 2)] for Poisson goals, scaled to expected minutes.
  const concededDeduction =
    player.elementType <= 2
      ? ((conceded / 2 - (1 - Math.exp(-2 * conceded)) / 4) * evidence.minutes) / 90
      : 0;
  let availability = 1;
  if (applyAvailability)
    availability =
      player.status === 'a'
        ? 1
        : player.chanceOfPlayingNextRound != null
          ? player.chanceOfPlayingNextRound / 100
          : player.status === 'd'
            ? 0.5
            : 0;
  if (['u', 'n'].includes(player.status)) availability = 0;
  return (
    Math.max(
      0,
      evidence.appearance +
        evidence.sixty +
        attacking +
        cleanSheet * csPoints +
        evidence.dcPoints +
        bonus +
        saves -
        cards -
        concededDeduction
    ) * availability
  );
}

export interface TransferIdea {
  out: ElementDto;
  incoming: ElementDto;
  gain: number;
  hit: number;
  bank: number;
  incomingTotal: number;
  outgoingTotal: number;
  evidence: PlayerEvidence;
  outgoingEvidence: PlayerEvidence;
  fixtures: {
    event: number;
    incoming: ReturnType<PlannerContext['fixturesFor']>;
    outgoing: ReturnType<PlannerContext['fixturesFor']>;
  }[];
}

export function recommendTransfers({
  plan,
  ctx,
  event,
  horizon,
  elements,
  recent,
}: {
  plan: PlannerPlan;
  ctx: PlannerContext;
  event: number;
  horizon: number;
  elements: ElementDto[];
  recent: RecentPlayersDto;
}): { ideas: TransferIdea[]; events: number[]; reason: string } {
  const baseline = derivePlan(plan, ctx).gameweeks;
  const current = baseline.find((g) => g.event === event);
  const window = baseline.filter((g) => g.event >= event).slice(0, horizon);
  const events = window.map((g) => g.event);
  const empty = (reason: string) => ({ ideas: [], events, reason });
  if (!current || baseline.some((g) => g.event >= event && g.problems.length))
    return empty('Balance your existing plan first to evaluate additional transfers.');
  if (current.chip === 'wildcard' || current.chip === 'freehit')
    return empty(
      'Single-transfer advice is paused for Wildcard and Free Hit. Build the whole squad in the planner.'
    );
  if (!recent.throughEvent || recent.throughEvent >= event)
    return empty('Completed-match data before this gameweek is required.');
  if (events.length < 3)
    return empty('Choose an earlier gameweek for at least three weeks of transfer analysis.');
  if (window.some((g) => g.squad.some((id) => !recent.players[id]?.length)))
    return empty(
      'Some squad members are missing match history. Advice is paused until the squad can be evaluated.'
    );
  const byId = new Map(elements.map((p) => [p.id, p]));
  const evidence = new Map(
    elements.map((p) => [p.id, playerEvidence(p, recent.players[p.id] ?? [], elements)])
  );
  const values = new Map<number, Map<number, number>>();
  for (const week of events)
    values.set(
      week,
      new Map(
        elements.map((p) => [
          p.id,
          sum(
            ctx
              .fixturesFor(p.team, week)
              .map((f) => estimateFixture(p, evidence.get(p.id)!, f.difficulty, week === event))
          ),
        ])
      )
    );
  const total = (gw: typeof current) =>
    projectedLineupTotal(
      buildLineup(gw.players, (id) => values.get(gw.event)?.get(id) ?? 0),
      gw.chip,
      0
    );
  const baselineTotals = new Map(window.map((g) => [g.event, total(g)]));
  const ideas: TransferIdea[] = [];
  // Do not silently rewrite a transfer already chosen by the manager.
  const chosen = new Set(current.transfers.flatMap((t) => [t.in, t.out]));
  for (const owned of current.players) {
    const out = byId.get(owned.element);
    if (!out || chosen.has(out.id) || !evidence.get(out.id)?.games) continue;
    for (const incoming of elements) {
      const incomingEvidence = evidence.get(incoming.id)!;
      if (
        incoming.elementType !== out.elementType ||
        current.squad.includes(incoming.id) ||
        incoming.nowCost > current.bank + owned.sellingPrice ||
        incoming.status !== 'a' ||
        (incoming.chanceOfPlayingNextRound != null && incoming.chanceOfPlayingNextRound < 100) ||
        !incomingEvidence.reliable
      )
        continue;
      const alternative = derivePlan(
        addTransfer(plan, event, { out: out.id, in: incoming.id }, plan.updatedAt),
        ctx
      ).gameweeks;
      // Includes future duplicate/outgoing conflicts, budget and club limits.
      if (alternative.some((g) => g.event >= event && g.problems.length)) continue;
      const hit = sum(
        alternative
          .filter((g) => g.event >= event)
          .map((g) => g.hitCost - baseline.find((b) => b.event === g.event)!.hitCost)
      );
      const gain =
        sum(
          alternative
            .filter((g) => events.includes(g.event))
            .map((g) => total(g) - baselineTotals.get(g.event)!)
        ) - hit;
      const incomingTotal = sum(events.map((e) => values.get(e)!.get(incoming.id)!));
      const outgoingTotal = sum(events.map((e) => values.get(e)!.get(out.id)!));
      // Saving a free transfer has value. Require a material edge and a 15% sensitivity margin.
      const margin = Math.max(3, 0.15 * (incomingTotal + outgoingTotal));
      if (gain < margin) continue;
      const cautious = (g: typeof current, id: number, factor: number) =>
        projectedLineupTotal(
          buildLineup(
            g.players,
            (element) => (values.get(g.event)?.get(element) ?? 0) * (element === id ? factor : 1)
          ),
          g.chip,
          0
        );
      const sensitivityGain =
        sum(
          alternative
            .filter((g) => events.includes(g.event))
            .map(
              (g) =>
                cautious(g, incoming.id, 0.85) -
                cautious(
                  window.find((b) => b.event === g.event)!,
                  out.id,
                  1.15
                )
            )
        ) - hit;
      if (sensitivityGain <= 0) continue;
      ideas.push({
        out,
        incoming,
        gain,
        hit,
        bank: alternative.find((g) => g.event === event)!.bank,
        incomingTotal,
        outgoingTotal,
        evidence: incomingEvidence,
        outgoingEvidence: evidence.get(out.id)!,
        fixtures: events.map((week) => ({
          event: week,
          incoming: ctx.fixturesFor(incoming.team, week),
          outgoing: ctx.fixturesFor(out.team, week),
        })),
      });
    }
  }
  ideas.sort((a, b) => b.gain - a.gain || a.incoming.id - b.incoming.id);
  const usedOut = new Set<number>();
  const usedIn = new Set<number>();
  const selected = ideas
    .filter((idea) => {
      if (usedOut.has(idea.out.id) || usedIn.has(idea.incoming.id)) return false;
      usedOut.add(idea.out.id);
      usedIn.add(idea.incoming.id);
      return true;
    })
    .slice(0, 3);
  return {
    ideas: selected,
    events,
    reason: selected.length
      ? ''
      : 'Keep your transfer. No affordable move clears the minutes, squad-impact and uncertainty checks over this period.',
  };
}
