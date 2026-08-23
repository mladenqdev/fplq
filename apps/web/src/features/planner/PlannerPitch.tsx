import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { Lineup, LineupPlayer } from './lineup';
import PitchPlayerChip from './PitchPlayerChip';

interface Props {
  lineup: Lineup;
  index: BootstrapIndex;
  transferIns: Set<number>;
  replacedBy: Map<number, number>;
  onSelect: (player: LineupPlayer) => void;
}

const TYPE_ROWS = [1, 2, 3, 4];

export default function PlannerPitch({ lineup, index, transferIns, replacedBy, onSelect }: Props) {
  const renderChip = (player: LineupPlayer) => {
    const out = replacedBy.get(player.element);
    return (
      <PitchPlayerChip
        key={player.element}
        player={player}
        element={index.elementById.get(player.element)}
        teamShort={index.teamShort}
        isTransferIn={transferIns.has(player.element)}
        replacedName={out != null ? (index.elementById.get(out)?.webName ?? null) : null}
        isCaptain={lineup.captain === player.element}
        onClick={() => onSelect(player)}
      />
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line">
      <div className="space-y-3 bg-gradient-to-b from-[#0c6b3f]/25 to-[#0c6b3f]/5 px-1 py-4">
        {TYPE_ROWS.map((type) => {
          const row = lineup.rows[type];
          if (!row || row.length === 0) return null;
          return (
            <div key={type} className="flex flex-wrap items-start justify-center gap-1.5">
              {row.map(renderChip)}
            </div>
          );
        })}
      </div>
      <div className="border-t border-line bg-surface/60 px-1 py-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
            Bench
          </span>
          <span className="num text-[10px] text-faint">{lineup.formation}</span>
        </div>
        <div className="flex flex-wrap items-start justify-center gap-1.5">
          {lineup.bench.map(renderChip)}
        </div>
      </div>
    </section>
  );
}
