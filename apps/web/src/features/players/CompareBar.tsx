import type { ElementDto } from '@fplq/shared';
import PlayerPhoto from '../../components/PlayerPhoto';

interface Props {
  players: ElementDto[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onCompare: () => void;
}

export default function CompareBar({ players, onRemove, onClear, onCompare }: Props) {
  const canCompare = players.length >= 2;
  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-40 px-3">
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-line bg-surface2/95 px-2.5 py-2 shadow-xl backdrop-blur">
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface py-1 pl-1 pr-2"
            >
              <PlayerPhoto code={p.code} name={p.webName} className="h-6 w-5 rounded-full" />
              <span className="max-w-[6rem] truncate text-xs font-medium text-fg">{p.webName}</span>
              <button
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.webName}`}
                className="text-faint active:opacity-70"
              >
                ✕
              </button>
            </div>
          ))}
          {players.length === 0 && (
            <span className="px-1 py-1.5 text-xs text-muted">Tap players to compare</span>
          )}
        </div>
        <button
          onClick={onClear}
          className="shrink-0 rounded-full px-2 py-2 text-xs font-medium text-muted active:opacity-70"
        >
          Clear
        </button>
        <button
          onClick={onCompare}
          disabled={!canCompare}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Compare ({players.length})
        </button>
      </div>
    </div>
  );
}
