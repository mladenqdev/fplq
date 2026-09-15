interface Props {
  ascending: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}

export default function SortDirectionButton({ ascending, onToggle, ariaLabel }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={ariaLabel ?? `Sort ${ascending ? 'lowest' : 'highest'} first`}
      className="group flex min-h-10 items-center gap-2 rounded-lg border border-line bg-bg px-2.5 text-xs font-medium text-muted hover:border-brand/50 hover:text-fg"
    >
      <span>{ascending ? 'Lowest first' : 'Highest first'}</span>
      <span className="grid size-6 place-items-center rounded-md bg-surface2 text-sm font-bold text-brand group-active:scale-95">
        {ascending ? '↑' : '↓'}
      </span>
    </button>
  );
}
