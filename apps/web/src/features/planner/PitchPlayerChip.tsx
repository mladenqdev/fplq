import { fdrBand, fdrColor, type ElementDto } from '@fplq/shared';
import type { LineupPlayer } from './lineup';

interface Props {
  player: LineupPlayer;
  element: ElementDto | undefined;
  teamShort: (id: number) => string;
  isTransferIn: boolean;
  replacedName: string | null;
  isCaptain: boolean;
  onClick: () => void;
}

// status: a available, d doubtful, i injured, s suspended, u/n unavailable.
function statusColor(status: string | undefined): string | null {
  if (!status || status === 'a') return null;
  if (status === 'd') return 'bg-warn';
  return 'bg-down';
}

function textOn(difficulty: number): string {
  return fdrBand(difficulty) === 'neutral' ? '#111111' : '#ffffff';
}

export default function PitchPlayerChip({
  player,
  element,
  teamShort,
  isTransferIn,
  replacedName,
  isCaptain,
  onClick,
}: Props) {
  const injury = statusColor(element?.status);
  const name = element?.webName ?? String(player.element);

  return (
    <button
      onClick={onClick}
      className={`relative flex w-[4.6rem] flex-col items-center rounded-lg border bg-surface/90 px-1 pb-1 pt-1.5 text-center active:opacity-70 ${
        isTransferIn ? 'border-accent ring-2 ring-accent/60' : 'border-line'
      }`}
    >
      <div className="absolute left-1 top-1 flex items-center gap-0.5">
        {injury && <span className={`size-1.5 rounded-full ${injury}`} />}
      </div>
      <div className="absolute right-1 top-1 flex items-center gap-0.5">
        {isCaptain && (
          <span className="grid size-4 place-items-center rounded-full bg-accent text-[9px] font-black text-black">
            C
          </span>
        )}
        {isTransferIn && (
          <span className="rounded bg-accent px-1 text-[8px] font-black leading-4 text-black">
            IN
          </span>
        )}
      </div>

      <div className="mt-3 max-w-full truncate text-[11px] font-semibold leading-tight text-fg">
        {name}
      </div>
      <div className="max-w-full truncate text-[9px] text-muted">
        {element ? teamShort(element.team) : teamShort(player.team)}
      </div>

      <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-0.5">
        {player.fixtures.length === 0 ? (
          <span className="rounded bg-surface2 px-1 py-0.5 text-[8px] font-semibold text-faint">
            BLK
          </span>
        ) : (
          player.fixtures.map((f) => (
            <span
              key={f.id}
              className="rounded px-1 py-0.5 text-[8px] font-semibold leading-none"
              style={{ backgroundColor: fdrColor(f.difficulty), color: textOn(f.difficulty) }}
            >
              {teamShort(f.opponent)}
              <span className="opacity-80">{f.isHome ? 'H' : 'A'}</span>
            </span>
          ))
        )}
      </div>

      <div className="mt-0.5 flex items-baseline gap-0.5">
        <span className="num text-sm font-bold leading-none text-fg">{player.proj.toFixed(1)}</span>
        <span className="text-[8px] leading-none text-faint">proj</span>
      </div>

      {isTransferIn && replacedName && (
        <div className="max-w-full truncate text-[8px] leading-tight text-faint">
          ← {replacedName}
        </div>
      )}
    </button>
  );
}
