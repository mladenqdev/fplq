import { useEffect, useMemo, useState } from 'react';
import { derivePlan, projectPlayerPoints, type DerivedGameweek } from '@fplq/shared';
import { useBootstrap, useFixtures, useSquad } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { buildTeamFixtureIndex, type TeamFixtureItem } from '../../lib/team-fixtures';
import { useEntryId } from '../../stores/useEntryId';
import { usePlannerStore } from '../../stores/usePlanner';
import { ErrorState, LoadingScreen } from '../../components/states';
import { buildPlannerContext } from './context';
import { buildLineup, type LineupPlayer } from './lineup';
import GwColumns from './GwColumns';
import GwHeader from './GwHeader';
import GwSelector from './GwSelector';
import PlannerPitch from './PlannerPitch';
import SquadTable from './SquadTable';
import TransferSheet, { type TransferTarget } from './TransferSheet';

export default function PlannerPage() {
  const entryId = useEntryId();
  const squadQ = useSquad(entryId);
  const bootstrapQ = useBootstrap();
  const fixturesQ = useFixtures();
  const index = useBootstrapIndex(bootstrapQ.data);

  const { plan, sync, addTransfer, removeTransfer, setChip, reset } = usePlannerStore();
  const [target, setTarget] = useState<TransferTarget | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverview, setShowOverview] = useState(false);

  useEffect(() => {
    if (squadQ.data) sync(entryId, squadQ.data.baseEvent);
  }, [squadQ.data, entryId, sync]);

  const fixtureIndex = useMemo(
    () =>
      fixturesQ.data ? buildTeamFixtureIndex(fixturesQ.data) : new Map<string, TeamFixtureItem[]>(),
    [fixturesQ.data]
  );

  const ctx = useMemo(() => {
    if (!squadQ.data || !bootstrapQ.data || !index) return null;
    return buildPlannerContext(squadQ.data, bootstrapQ.data, index, fixtureIndex);
  }, [squadQ.data, bootstrapQ.data, index, fixtureIndex]);

  const derived = useMemo(() => (plan && ctx ? derivePlan(plan, ctx) : null), [plan, ctx]);

  const perGw = useMemo(() => {
    if (!derived || !index) return [];
    return derived.gameweeks.map((gw) => {
      const projByElement = new Map<number, number>();
      for (const p of gw.players) {
        const el = index.elementById.get(p.element);
        const proj = el
          ? projectPlayerPoints(
              {
                epNext: el.epNext,
                epThis: el.epThis,
                pointsPerGame: el.pointsPerGame,
                form: el.form,
                status: el.status,
              },
              p.fixtures
            )
          : 0;
        projByElement.set(p.element, proj);
      }
      const lineup = buildLineup(gw.players, (e) => projByElement.get(e) ?? 0);
      const total = lineup.xiElements.reduce((s, e) => s + (projByElement.get(e) ?? 0), 0);
      return {
        gw,
        lineup,
        total: Math.round(total * 10) / 10,
        transferIns: new Set(gw.transfers.map((t) => t.in)),
        replacedBy: new Map(gw.transfers.map((t) => [t.in, t.out])),
        hasProblem: gw.problems.length > 0,
      };
    });
  }, [derived, index]);

  if (squadQ.isPending || bootstrapQ.isPending || fixturesQ.isPending) {
    return <LoadingScreen label="Loading squad" />;
  }
  if (squadQ.isError || bootstrapQ.isError || fixturesQ.isError || !index) {
    return (
      <ErrorState
        error={squadQ.error ?? bootstrapQ.error ?? fixturesQ.error}
        onRetry={() => {
          squadQ.refetch();
          bootstrapQ.refetch();
          fixturesQ.refetch();
        }}
      />
    );
  }
  if (!derived || !ctx || !plan || perGw.length === 0) {
    return <LoadingScreen label="Building plan" />;
  }

  const activeVm = perGw.find((v) => v.gw.event === selected) ?? perGw[0];
  if (!activeVm) return <LoadingScreen label="Building plan" />;
  const activeEvent = activeVm.gw.event;

  const totalHits = derived.gameweeks.reduce((sum, gw) => sum + gw.hitCost, 0);
  const hasProblems = derived.gameweeks.some((gw) => gw.problems.length > 0);

  const openTransfer = (gw: DerivedGameweek, player: LineupPlayer) => {
    setTarget({
      outElement: player.element,
      event: gw.event,
      budget: gw.bank + player.sellingPrice,
      elementType: player.elementType,
      squad: gw.squad,
    });
  };

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-bold">Planner</h1>
          <p className="num text-xs text-faint">
            From GW{plan.baseEvent} · {derived.horizon} GW horizon
            {totalHits > 0 && <span className="text-down"> · −{totalHits} total hits</span>}
          </p>
        </div>
        <button
          onClick={reset}
          className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium active:opacity-70"
        >
          Reset
        </button>
      </div>

      <GwSelector
        items={perGw.map((v) => ({ event: v.gw.event, total: v.total, hasProblem: v.hasProblem }))}
        active={activeEvent}
        onSelect={setSelected}
      />

      <GwHeader
        gw={activeVm.gw}
        total={activeVm.total}
        index={index}
        ctx={ctx}
        onSetChip={setChip}
        onRemoveTransfer={removeTransfer}
      />

      <PlannerPitch
        lineup={activeVm.lineup}
        index={index}
        transferIns={activeVm.transferIns}
        replacedBy={activeVm.replacedBy}
        onSelect={(player) => openTransfer(activeVm.gw, player)}
      />

      <p className="px-1 text-[11px] text-faint">
        Projected points are an estimate from expected points, form and fixture difficulty. Tap a
        player to plan a transfer for GW{activeEvent}.
      </p>

      <button
        onClick={() => setShowOverview((v) => !v)}
        className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium active:opacity-70"
      >
        {showOverview ? 'Hide fixture overview' : 'Show fixture overview'}
      </button>

      {showOverview && (
        <div className="space-y-3">
          <GwColumns
            gameweeks={derived.gameweeks}
            index={index}
            ctx={ctx}
            onSetChip={setChip}
            onRemoveTransfer={removeTransfer}
          />
          {hasProblems && (
            <p className="px-1 text-[11px] text-down">
              Some gameweeks have squad problems — see the highlighted columns above.
            </p>
          )}
          <SquadTable gameweeks={derived.gameweeks} index={index} onOpen={setTarget} />
        </div>
      )}

      <TransferSheet
        target={target}
        index={index}
        fixtureIndex={fixtureIndex}
        onSelect={(inElement) => {
          if (target) addTransfer(target.event, { out: target.outElement, in: inElement });
          setTarget(null);
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}
