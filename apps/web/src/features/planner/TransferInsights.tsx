import { useMemo, useState, type ReactNode } from 'react';
import {
  formatPrice,
  projectPlayerPoints,
  type DerivedGameweek,
  type ElementDto,
  type PlannerPlan,
  type PlannerContext,
} from '@fplq/shared';
import PlayerPhoto from '../../components/PlayerPhoto';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { TeamFixtureItem } from '../../lib/team-fixtures';
import { usePlayerRecent } from '../../lib/queries';
import { recommendTransfers } from './transfer-recommendations';
import TransferIdeas from './TransferIdeas';

type InsightTab = 'ideas' | 'form' | 'prices' | 'squad';

interface Props {
  plan: PlannerPlan;
  ctx: PlannerContext;
  gw: DerivedGameweek;
  index: BootstrapIndex;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onPlanTransfer: (outElement: number, inElement: number) => void;
  onExplorePlayer: (element: number) => void;
}

const TABS: { key: InsightTab; label: string }[] = [
  { key: 'ideas', label: 'Ideas' },
  { key: 'form', label: 'Form' },
  { key: 'prices', label: 'Prices' },
  { key: 'squad', label: 'Squad' },
];

function project(element: ElementDto, fixtures: TeamFixtureItem[]): number {
  return projectPlayerPoints(
    {
      epNext: element.epNext,
      epThis: element.epThis,
      pointsPerGame: element.pointsPerGame,
      form: element.form,
      status: element.status,
    },
    fixtures
  );
}

export default function TransferInsights({
  plan,
  ctx,
  gw,
  index,
  fixtureIndex,
  onPlanTransfer,
  onExplorePlayer,
}: Props) {
  const [tab, setTab] = useState<InsightTab>('ideas');
  const [horizon, setHorizon] = useState(3);
  const recent = usePlayerRecent();
  const squad = useMemo(() => new Set(gw.squad), [gw.squad]);

  const projections = useMemo(() => {
    const values = new Map<number, number>();
    for (const element of index.bootstrap.elements) {
      values.set(
        element.id,
        project(element, fixtureIndex.get(`${element.team}:${gw.event}`) ?? [])
      );
    }
    return values;
  }, [fixtureIndex, gw.event, index.bootstrap.elements]);

  const suggestions = useMemo(() => {
    if (!recent.data) return null;
    return recommendTransfers({
      plan,
      ctx,
      event: gw.event,
      horizon,
      elements: index.bootstrap.elements,
      recent: recent.data,
    });
  }, [plan, ctx, gw.event, horizon, index.bootstrap.elements, recent.data]);

  const inForm = useMemo(
    () =>
      index.bootstrap.elements
        .filter((element) => element.minutes > 0 && ['a', 'd'].includes(element.status))
        .sort(
          (a, b) =>
            b.form - a.form ||
            (projections.get(b.id) ?? 0) - (projections.get(a.id) ?? 0) ||
            b.totalPoints - a.totalPoints
        )
        .slice(0, 5),
    [index.bootstrap.elements, projections]
  );

  const priceRisers = useMemo(
    () =>
      index.bootstrap.elements
        .filter((element) => element.priceChangePercent > 0 && element.status !== 'u')
        .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
        .slice(0, 3),
    [index.bootstrap.elements]
  );
  const priceFallers = useMemo(
    () =>
      index.bootstrap.elements
        .filter((element) => element.priceChangePercent < 0)
        .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
        .slice(0, 3),
    [index.bootstrap.elements]
  );

  const squadWatch = useMemo(
    () =>
      gw.squad
        .map((id) => index.elementById.get(id))
        .filter((element): element is ElementDto => Boolean(element))
        .map((element) => ({
          element,
          projection: projections.get(element.id) ?? 0,
          urgency:
            (element.status === 'a' ? 0 : 100) +
            Math.max(0, -element.priceChangePercent) +
            Math.max(0, 3 - (projections.get(element.id) ?? 0)),
        }))
        .filter(
          ({ element, projection }) =>
            element.status !== 'a' || element.priceChangePercent < 0 || projection < 3
        )
        .sort((a, b) => b.urgency - a.urgency)
        .slice(0, 5),
    [gw.squad, index.elementById, projections]
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-3" aria-label="Transfer radar">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Transfer radar</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Transfer decisions, recent form and price watch.
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-surface2 px-2 py-1 text-[10px] text-faint">
          GW{gw.event}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-surface2 p-1" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`min-h-10 rounded-lg text-xs font-semibold ${tab === item.key ? 'bg-bg text-brand shadow-sm' : 'text-muted'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-32">
        {tab === 'ideas' && (
          <TransferIdeas
            result={suggestions}
            horizon={horizon}
            onHorizon={setHorizon}
            loading={recent.isPending}
            error={recent.isError}
            onRetry={() => void recent.refetch()}
            throughEvent={recent.data?.throughEvent ?? null}
            index={index}
            onPlanTransfer={onPlanTransfer}
          />
        )}
        {tab === 'form' && (
          <InsightList
            empty="No form data yet."
            items={inForm.map((element) => ({
              key: element.id,
              element,
              title: element.webName,
              detail: `${index.teamShort(element.team)} · £${formatPrice(element.nowCost)} · ${(projections.get(element.id) ?? 0).toFixed(1)} estimated`,
              value: element.form.toFixed(1),
              valueLabel: 'form',
              action: squad.has(element.id) ? 'In squad' : 'Explore',
              disabled: squad.has(element.id),
              onClick: () => onExplorePlayer(element.id),
            }))}
          />
        )}
        {tab === 'prices' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <PriceList
              title="Likely risers"
              players={priceRisers}
              index={index}
              squad={squad}
              onExplorePlayer={onExplorePlayer}
            />
            <PriceList
              title="Likely fallers"
              players={priceFallers}
              index={index}
              squad={squad}
              onExplorePlayer={onExplorePlayer}
            />
          </div>
        )}
        {tab === 'squad' && (
          <InsightList
            empty="No urgent squad issues in the current data."
            items={squadWatch.map(({ element, projection }) => ({
              key: element.id,
              element,
              title: element.webName,
              detail:
                element.status !== 'a'
                  ? element.news || 'Availability flag'
                  : element.priceChangePercent < 0
                    ? `${Math.abs(element.priceChangePercent)}% towards a price fall`
                    : `${projection.toFixed(1)} estimated this GW`,
              value: projection.toFixed(1),
              valueLabel: 'estimated',
              action: 'Replace',
              onClick: () => onExplorePlayer(element.id),
            }))}
          />
        )}
      </div>
      <p className="mt-2 text-[10px] text-faint">
        {tab === 'ideas'
          ? 'Individual alternatives, not a transfer package. Review team news before the deadline.'
          : 'Price progress is a signal, not the probability of a price change.'}
      </p>
    </section>
  );
}

interface InsightItem {
  key: string | number;
  element: ElementDto;
  title: ReactNode;
  detail: string;
  value: string;
  valueLabel: string;
  action: string;
  disabled?: boolean;
  onClick: () => void;
}

function InsightList({ items, empty }: { items: InsightItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="grid min-h-32 place-items-center text-center text-xs text-muted">{empty}</p>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex min-h-[3.75rem] items-center gap-2 py-1.5">
          <PlayerPhoto
            code={item.element.code}
            name={item.element.webName}
            className="h-10 w-8 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{item.title}</div>
            <div className="truncate text-[10px] text-faint">{item.detail}</div>
          </div>
          <div className="num shrink-0 text-right">
            <div className="text-xs font-bold text-accent">{item.value}</div>
            <div className="text-[9px] text-faint">{item.valueLabel}</div>
          </div>
          <button
            onClick={item.onClick}
            disabled={item.disabled}
            className="min-h-10 min-w-14 rounded-lg border border-line bg-bg px-2 text-[10px] font-semibold text-brand disabled:text-faint"
          >
            {item.action}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PriceList({
  title,
  players,
  index,
  squad,
  onExplorePlayer,
}: {
  title: string;
  players: ElementDto[];
  index: BootstrapIndex;
  squad: Set<number>;
  onExplorePlayer: (element: number) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</h3>
      <ul className="divide-y divide-line">
        {players.map((element) => (
          <li key={element.id}>
            <button
              onClick={() => onExplorePlayer(element.id)}
              className="flex min-h-11 w-full items-center gap-2 py-1 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{element.webName}</span>
                <span className="block text-[10px] text-faint">
                  {index.teamShort(element.team)} · £{formatPrice(element.nowCost)}
                  {squad.has(element.id) ? ' · in squad' : ''}
                </span>
              </span>
              <span
                className={`num text-xs font-bold ${element.priceChangePercent > 0 ? 'text-up' : 'text-down'}`}
              >
                {element.priceChangePercent > 0 ? '▲' : '▼'} {Math.abs(element.priceChangePercent)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
