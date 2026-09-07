import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { Lineup, LineupPlayer } from './lineup';
import PitchPlayerChip from './PitchPlayerChip';
import { teamFixtures, type TeamFixtureItem } from '../../lib/team-fixtures';

interface Props {
  lineup: Lineup;
  removed: number[];
  onRemove: (player: LineupPlayer) => void;
  index: BootstrapIndex;
  transferIns: Set<number>;
  replacedBy: Map<number, number>;
  selectedElement: number | null;
  eligibleType: number | null;
  event: number;
  fixtureCount: number;
  fixtureIndex: Map<string, TeamFixtureItem[]>;
  onRevert: (element: number) => void;
  onSelect: (player: LineupPlayer) => void;
}

const TYPE_ROWS = [1, 2, 3, 4];

export default function PlannerPitch({
  lineup,
  removed,
  onRemove,
  index,
  transferIns,
  replacedBy,
  selectedElement,
  eligibleType,
  event,
  fixtureCount,
  fixtureIndex,
  onRevert,
  onSelect,
}: Props) {
  const renderChip = (player: LineupPlayer) => {
    const out = replacedBy.get(player.element);
    return (
      <PitchPlayerChip
        key={player.element}
        player={player}
        removed={removed.includes(player.element)}
        onRemove={() => onRemove(player)}
        element={index.elementById.get(player.element)}
        index={index}
        fixtures={teamFixtures(fixtureIndex, player.team, event, fixtureCount)}
        replacedName={out != null ? (index.elementById.get(out)?.webName ?? null) : null}
        isCaptain={lineup.captain === player.element}
        selected={selectedElement === player.element}
        compact={selectedElement != null || eligibleType != null}
        disabled={eligibleType != null && eligibleType !== player.elementType}
        onRevert={
          removed.includes(player.element) || transferIns.has(player.element)
            ? () => onRevert(player.element)
            : undefined
        }
        onClick={() => onSelect(player)}
      />
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line" aria-label="Planned lineup">
      <div
        className="relative space-y-2 bg-[#12543f] px-1 py-3 lg:space-y-3 lg:py-4"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 12.5%, rgba(255,255,255,.035) 12.5%, rgba(255,255,255,.035) 25%)',
        }}
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          stroke="white"
          strokeOpacity=".2"
          strokeWidth=".35"
        >
          <rect x="2" y="2" width="96" height="96" />
          <path d="M2 50h96M28 2v15h44V2M28 98V83h44v15M40 2v6h20V2M40 98v-6h20v6" />
          <ellipse cx="50" cy="50" rx="12" ry="12" />
        </svg>
        {TYPE_ROWS.map((type) => {
          const row = lineup.rows[type];
          if (!row || row.length === 0) return null;
          return (
            <div key={type} className="relative flex items-start justify-center gap-1 lg:gap-3">
              {row.map(renderChip)}
            </div>
          );
        })}
      </div>
      <div className="border-t border-line bg-surface/60 px-1 py-2">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            Bench
          </span>
          <span className="num text-[10px] text-faint">{lineup.formation}</span>
        </div>
        <div className="flex items-start justify-center gap-1 lg:gap-3">
          {lineup.bench.map(renderChip)}
        </div>
      </div>
    </section>
  );
}
