import { fdrBand, fdrColor } from '@fplq/shared';
import type { BootstrapIndex } from '../lib/bootstrap-index';
import type { TeamGwFixtures } from '../lib/team-fixtures';

interface Props {
  gws: TeamGwFixtures[];
  index: BootstrapIndex;
}

function textOn(difficulty: number): string {
  return fdrBand(difficulty) === 'neutral' ? '#111111' : '#ffffff';
}

export default function FixtureStrip({ gws, index }: Props) {
  return (
    <div className="flex gap-1">
      {gws.map((gw) => (
        <div key={gw.event} className="flex flex-1 flex-col gap-0.5">
          {gw.items.length === 0 ? (
            <div className="rounded bg-surface2 py-0.5 text-center text-[9px] text-faint">–</div>
          ) : (
            gw.items.map((item, i) => (
              <div
                key={i}
                className="rounded py-0.5 text-center text-[9px] font-semibold leading-tight"
                style={{
                  backgroundColor: fdrColor(item.difficulty),
                  color: textOn(item.difficulty),
                }}
              >
                {index.teamShort(item.opponent)}
                <span className="opacity-80">{item.isHome ? 'H' : 'A'}</span>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
