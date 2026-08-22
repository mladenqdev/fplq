import { useEffect, useMemo, useState } from 'react';
import { derivePlan } from '@fplq/shared';
import { useBootstrap, useFixtures, useSquad } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { buildTeamFixtureIndex, type TeamFixtureItem } from '../../lib/team-fixtures';
import { useEntryId } from '../../stores/useEntryId';
import { usePlannerStore } from '../../stores/usePlanner';
import { ErrorState, LoadingScreen } from '../../components/states';
import { buildPlannerContext } from './context';
import GwColumns from './GwColumns';
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
  if (!derived || !ctx || !plan) return <LoadingScreen label="Building plan" />;

  const totalHits = derived.gameweeks.reduce((sum, gw) => sum + gw.hitCost, 0);
  const hasProblems = derived.gameweeks.some((gw) => gw.problems.length > 0);

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
