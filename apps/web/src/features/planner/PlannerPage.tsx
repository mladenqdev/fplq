import { useEffect, useMemo, useState } from 'react';
import { derivePlan, projectPlayerPoints, type DerivedGameweek } from '@fplq/shared';
import { useBootstrap, useFixtures, useSquad } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { buildTeamFixtureIndex, type TeamFixtureItem } from '../../lib/team-fixtures';
import { useEntryId } from '../../stores/useEntryId';
import { usePlannerStore } from '../../stores/usePlanner';
import { ErrorState, LoadingScreen } from '../../components/states';
import { buildPlannerContext } from './context';
import { buildLineup, fillLineupSlots, projectedLineupTotal, type LineupPlayer } from './lineup';
import GwColumns from './GwColumns';
import GwHeader from './GwHeader';
import GwSelector from './GwSelector';
import PlannerPitch from './PlannerPitch';
import SquadTable from './SquadTable';
import TransferPanel, { type TransferTarget } from './TransferPanel';

export default function PlannerPage() {
  const entryId = useEntryId();
  const squadQ = useSquad(entryId);
  const bootstrapQ = useBootstrap();
  const fixturesQ = useFixtures();
  const index = useBootstrapIndex(bootstrapQ.data);

  const { plan, sync, addTransfer, removeTransfer, setChip, reset, undo, redo, past, future } =
    usePlannerStore();
  const [target, setTarget] = useState<TransferTarget | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [incomingId, setIncomingId] = useState<number | null>(null);
  const [fixtureCount, setFixtureCount] = useState(1);
  const [removed, setRemoved] = useState<number[]>([]);

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
    if (!derived || !index || !plan || !ctx) return [];
    const baseline = derivePlan(
      {
        ...plan,
        gameweeks: Object.fromEntries(
          Object.entries(plan.gameweeks).map(([event, gw]) => [event, { ...gw, transfers: [] }])
        ),
      },
      ctx
    );
    let slots = new Map(ctx.startingSquad.map((id) => [id, id]));
    return derived.gameweeks.map((gw) => {
      const projByElement = new Map<number, number>();
      for (const p of [
        ...(baseline.gameweeks.find((b) => b.event === gw.event)?.players ?? []),
        ...gw.players,
      ]) {
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
      const reference = buildLineup(
        baseline.gameweeks.find((b) => b.event === gw.event)!.players,
        (e) => projByElement.get(e) ?? 0
      );
      const eventSlots = new Map(slots);
      for (const transfer of gw.transfers) {
        const original = [...eventSlots].find(([, current]) => current === transfer.out)?.[0];
        if (original != null) eventSlots.set(original, transfer.in);
      }
      if (gw.chip !== 'freehit') slots = eventSlots;
      const lineup = fillLineupSlots(
        reference,
        gw.players.map((p) => ({ ...p, proj: projByElement.get(p.element) ?? 0 })),
        eventSlots
      );
      const total = projectedLineupTotal(lineup, gw.chip, gw.hitCost);
      return {
        gw,
        lineup,
        total: Math.round(total * 10) / 10,
        transferIns: new Set(gw.transfers.map((t) => t.in)),
        replacedBy: new Map(gw.transfers.map((t) => [t.in, t.out])),
        hasProblem: gw.problems.length > 0,
      };
    });
  }, [derived, index, plan, ctx]);

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
  const incoming = incomingId != null ? index.elementById.get(incomingId) : undefined;
  const targetPlayer =
    target?.event === activeEvent
      ? activeVm.gw.players.find((p) => p.element === target.outElement)
      : undefined;
  const activeTarget =
    targetPlayer && target
      ? {
          ...target,
          budget: activeVm.gw.bank + targetPlayer.sellingPrice,
          squad: activeVm.gw.squad,
        }
      : null;

  const totalHits = derived.gameweeks.reduce((sum, gw) => sum + gw.hitCost, 0);
  const hasProblems = derived.gameweeks.some((gw) => gw.problems.length > 0);

  const openTransfer = (gw: DerivedGameweek, player: LineupPlayer) => {
    if (incoming && incoming.elementType === player.elementType) {
      addTransfer(gw.event, { out: player.element, in: incoming.id });
      setRemoved((ids) => ids.filter((id) => id !== player.element));
      setIncomingId(null);
      setTarget(null);
      return;
    }
    setIncomingId(null);
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (removed.length) setRemoved((ids) => ids.slice(0, -1));
              else undo();
              setTarget(null);
              setIncomingId(null);
            }}
            disabled={past.length === 0 && removed.length === 0}
            className="rounded-lg bg-surface2 px-3 py-2 text-xs disabled:opacity-30"
          >
            ↶ Undo
          </button>
          <button
            onClick={() => {
              redo();
              setRemoved([]);
              setTarget(null);
              setIncomingId(null);
            }}
            disabled={future.length === 0}
            className="rounded-lg bg-surface2 px-3 py-2 text-xs disabled:opacity-30"
          >
            ↷ Redo
          </button>
          <button
            onClick={() => {
              reset();
              setRemoved([]);
              setTarget(null);
              setIncomingId(null);
            }}
            className="rounded-full bg-surface2 px-4 py-2 text-sm font-medium active:opacity-70"
          >
            Reset
          </button>
        </div>
      </div>

      <GwSelector
        items={perGw.map((v) => ({ event: v.gw.event, total: v.total, hasProblem: v.hasProblem }))}
        active={activeEvent}
        onSelect={(event) => {
          setSelected(event);
          setRemoved([]);
          setTarget(null);
          setIncomingId(null);
        }}
      />

      <GwHeader
        gw={activeVm.gw}
        total={activeVm.total}
        index={index}
        ctx={ctx}
        onSetChip={setChip}
        onRemoveTransfer={removeTransfer}
      />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <div
          className={`${activeTarget || incoming ? 'sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 bg-bg' : ''} lg:sticky lg:top-[calc(env(safe-area-inset-top)+4rem)]`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-surface2 p-1">
              {[1, 3].map((count) => (
                <button
                  key={count}
                  onClick={() => setFixtureCount(count)}
                  aria-pressed={fixtureCount === count}
                  className={`rounded-md px-3 py-1 text-xs ${fixtureCount === count ? 'bg-brand text-black' : 'text-muted'}`}
                >
                  {count === 1 ? 'This GW' : 'Next 3 GWs'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-faint">× to remove · red × to restore</span>
          </div>
          <PlannerPitch
            lineup={activeVm.lineup}
            removed={removed}
            onRemove={(player) => {
              setRemoved((ids) => [...new Set([...ids, player.element])]);
              setIncomingId(null);
              setTarget({
                outElement: player.element,
                event: activeEvent,
                budget: activeVm.gw.bank + player.sellingPrice,
                elementType: player.elementType,
                squad: activeVm.gw.squad,
              });
            }}
            index={index}
            transferIns={activeVm.transferIns}
            replacedBy={activeVm.replacedBy}
            selectedElement={activeTarget?.outElement ?? null}
            eligibleType={incoming?.elementType ?? null}
            event={activeEvent}
            fixtureCount={fixtureCount}
            fixtureIndex={fixtureIndex}
            onRevert={(element) => {
              if (removed.includes(element)) {
                setRemoved((ids) => ids.filter((id) => id !== element));
                if (activeTarget?.outElement === element) setTarget(null);
                return;
              }
              const i = activeVm.gw.transfers.findIndex((t) => t.in === element);
              if (i >= 0) removeTransfer(activeEvent, i);
              setTarget(null);
              setIncomingId(null);
            }}
            onSelect={(player) => openTransfer(activeVm.gw, player)}
          />
        </div>
        <TransferPanel
          target={activeTarget}
          event={activeEvent}
          squad={activeVm.gw.squad}
          incoming={incoming}
          index={index}
          fixtureIndex={fixtureIndex}
          onSelect={(inElement) => {
            if (activeTarget) {
              addTransfer(activeTarget.event, { out: activeTarget.outElement, in: inElement });
              setRemoved((ids) => ids.filter((id) => id !== activeTarget.outElement));
              setIncomingId(null);
            } else setIncomingId(inElement);
            setTarget(null);
          }}
          onClose={() => {
            setTarget(null);
            setIncomingId(null);
          }}
        />
      </div>

      <p className="px-1 text-[11px] text-faint">
        Estimates include the automatically selected captain, chip effects and transfer hits. The
        initial XI is selected by projection; transfers retain the outgoing player’s pitch or bench
        slot.
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
    </div>
  );
}
