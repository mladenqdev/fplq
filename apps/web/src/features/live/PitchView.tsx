import { useMemo } from 'react';
import type { EntryLiveDto, EntryLivePickDto } from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import PlayerChip from './PlayerChip';

interface Props {
  data: EntryLiveDto;
  index: BootstrapIndex;
  onSelect: (pick: EntryLivePickDto) => void;
}

const TYPE_ROWS = [1, 2, 3, 4];

export default function PitchView({ data, index, onSelect }: Props) {
  const { starters, bench } = useMemo(() => {
    const sorted = [...data.picks].sort((a, b) => a.position - b.position);
    return {
      starters: sorted.filter((p) => p.position <= 11),
      bench: sorted.filter((p) => p.position >= 12),
    };
  }, [data.picks]);

  const renderChip = (pick: EntryLivePickDto) => (
    <PlayerChip
      key={pick.element}
      pick={pick}
      element={index.elementById.get(pick.element)}
      teamShort={index.teamShort}
      onClick={() => onSelect(pick)}
    />
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-line">
      <div className="space-y-3 bg-gradient-to-b from-[#0c6b3f]/25 to-[#0c6b3f]/5 px-1 py-4">
        {TYPE_ROWS.map((type) => {
          const row = starters.filter((p) => p.elementType === type);
          if (row.length === 0) return null;
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
            Bench {data.activeChip === 'bboost' && '· boosted'}
          </span>
          <span className="num text-[10px] text-faint">{data.pointsOnBench} pts on bench</span>
        </div>
        <div className="flex flex-wrap items-start justify-center gap-1.5">
          {bench.map(renderChip)}
        </div>
      </div>
    </section>
  );
}
