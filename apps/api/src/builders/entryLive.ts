// Builds EntryLiveDto (the Live tab payload) from picks + live + fixtures + entry +
// bootstrap + history, using the shared domain functions. See ARCHITECTURE.md 3.2-3.5.

import type {
  FplFixture,
  FplElement,
  EntryLiveDto,
  EntryLivePickDto,
  EntryLivePickFixtureDto,
  AutoSubPick,
  PlayInfo,
  LivePointsRow,
} from '@fplq/shared';
import { fixtureState, fixtureBonus, projectAutoSubs, computeLivePoints } from '@fplq/shared';
import type { AppContext } from '../context';
import { mapEntry } from '../mappers/entry';

function scoreOf(f: FplFixture): string | null {
  if (!f.started || f.team_h_score === null || f.team_a_score === null) return null;
  return `${f.team_h_score}-${f.team_a_score}`;
}

export async function buildEntryLive(
  ctx: AppContext,
  entryId: number,
  gw: number
): Promise<EntryLiveDto> {
  const [picks, live, fixtures, entry, bootstrap, history] = await Promise.all([
    ctx.getPicks(entryId, gw),
    ctx.getLive(gw),
    ctx.getFixturesByEvent(gw),
    ctx.getEntry(entryId),
    ctx.getBootstrap(),
    ctx.getHistory(entryId),
  ]);

  const elementsById = new Map<number, FplElement>(bootstrap.value.elements.map((e) => [e.id, e]));
  const liveById = new Map(live.value.elements.map((e) => [e.id, e]));
  const gwFixtures = fixtures.value;
  const bonusByFixture = new Map(gwFixtures.map((f) => [f.id, fixtureBonus(f)]));

  const teamFixtures = (team: number): FplFixture[] =>
    gwFixtures.filter((f) => f.team_h === team || f.team_a === team);

  const playByElement = new Map<number, PlayInfo>();
  for (const pick of picks.value.picks) {
    const element = elementsById.get(pick.element);
    const minutes = liveById.get(pick.element)?.stats.minutes ?? 0;
    const state = element ? fixtureState(teamFixtures(element.team)) : 'blank';
    playByElement.set(pick.element, { minutes, state });
  }

  const autoSubPicks: AutoSubPick[] = picks.value.picks.map((p) => ({
    element: p.element,
    position: p.position,
    multiplier: p.multiplier,
    isCaptain: p.is_captain,
    isViceCaptain: p.is_vice_captain,
    elementType: p.element_type,
  }));
  const subResult = projectAutoSubs(
    autoSubPicks,
    (el) => playByElement.get(el) ?? { minutes: 0, state: 'blank' },
    picks.value.active_chip
  );

  const officialSubs = picks.value.automatic_subs.map((s) => ({
    in: s.element_in,
    out: s.element_out,
  }));
  const useOfficial = officialSubs.length > 0;
  const effectiveSubs = useOfficial ? officialSubs : subResult.subs;
  const subbedIn = new Set(effectiveSubs.map((s) => s.in));
  const subbedOut = new Set(effectiveSubs.map((s) => s.out));

  const pickDtos: EntryLivePickDto[] = [];
  const pointRows: LivePointsRow[] = [];

  for (const pick of picks.value.picks) {
    const element = elementsById.get(pick.element);
    const liveEl = liveById.get(pick.element);
    const info = playByElement.get(pick.element)!;
    const team = element?.team ?? 0;
    const mine = teamFixtures(team);

    let bonusDisplay = 0;
    let bonusToAdd = 0;
    let bonusConfirmed = true;
    for (const f of mine) {
      const fb = bonusByFixture.get(f.id);
      if (!fb) continue;
      const value = fb.bonus.get(pick.element) ?? 0;
      bonusDisplay += value;
      if (!fb.confirmed) bonusToAdd += value;
      if (f.started && !fb.confirmed) bonusConfirmed = false;
    }

    const officialPoints = liveEl?.stats.total_points ?? 0;
    const points = officialPoints + bonusToAdd;
    const effectiveMultiplier = subResult.effectiveMultiplier.get(pick.element) ?? 0;

    const fixtureDtos: EntryLivePickFixtureDto[] = mine.map((f) => ({
      id: f.id,
      opponent: f.team_h === team ? f.team_a : f.team_h,
      isHome: f.team_h === team,
      started: f.started,
      finishedProvisional: f.finished_provisional,
      minutes: f.minutes,
      kickoffTime: f.kickoff_time,
      score: scoreOf(f),
    }));

    pickDtos.push({
      element: pick.element,
      position: pick.position,
      multiplier: pick.multiplier,
      effectiveMultiplier,
      isCaptain: pick.is_captain,
      isViceCaptain: pick.is_vice_captain,
      webName: element?.web_name ?? '',
      team,
      elementType: pick.element_type,
      nowCost: element?.now_cost ?? 0,
      photo: element?.photo ?? '',
      points,
      officialPoints,
      provisionalBonus: bonusDisplay,
      bonusConfirmed,
      bps: liveEl?.stats.bps ?? 0,
      minutes: info.minutes,
      fixtureState: info.state,
      fixtures: fixtureDtos,
      explain: (liveEl?.explain ?? []).flatMap((x) =>
        x.stats.map((s) => ({ identifier: s.identifier, points: s.points, value: s.value }))
      ),
      subbedIn: subbedIn.has(pick.element),
      subbedOut: subbedOut.has(pick.element),
    });

    pointRows.push({ points, multiplier: effectiveMultiplier });
  }

  const transfersCost = picks.value.entry_history.event_transfers_cost;
  const { computedPoints, pointsOnBench } = computeLivePoints(pointRows, transfersCost);

  const previousRow = history.value.current
    .filter((r) => r.event < gw)
    .sort((a, b) => b.event - a.event)[0];

  const eventMeta = bootstrap.value.events.find((e) => e.id === gw);
  const isLive = gwFixtures.some((f) => f.started && !f.finished);
  const gwFinished = eventMeta?.finished ?? gwFixtures.every((f) => f.finished);

  return {
    fetchedAt: live.fetchedAt,
    event: gw,
    entry: mapEntry(entry.value, entry.fetchedAt),
    isLive,
    gwFinished,
    official: {
      eventPoints: entry.value.summary_event_points,
      overallRank: entry.value.summary_overall_rank,
      eventRank: entry.value.summary_event_rank,
      overallPoints: entry.value.summary_overall_points,
    },
    previous: {
      overallRank: previousRow?.overall_rank ?? null,
      overallPoints: previousRow?.total_points ?? null,
    },
    activeChip: picks.value.active_chip,
    transfersCost,
    pointsOnBench,
    computedPoints,
    picks: pickDtos,
    autoSubs: effectiveSubs.map((s) => ({ in: s.in, out: s.out, official: useOfficial })),
  };
}
