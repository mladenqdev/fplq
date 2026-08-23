export interface GwSelectorItem {
  event: number;
  total: number;
  hasProblem: boolean;
}

interface Props {
  items: GwSelectorItem[];
  active: number;
  onSelect: (event: number) => void;
}

export default function GwSelector({ items, active, onSelect }: Props) {
  return (
    <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
      {items.map((item) => {
        const isActive = item.event === active;
        return (
          <button
            key={item.event}
            onClick={() => onSelect(item.event)}
            aria-pressed={isActive}
            className={`flex min-w-[3.75rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 ${
              isActive ? 'border-accent bg-brand-soft' : 'border-line bg-surface'
            }`}
          >
            <span className="flex items-center gap-1 text-xs font-bold">
              GW{item.event}
              {item.hasProblem && <span className="size-1.5 rounded-full bg-down" />}
            </span>
            <span className="num text-[11px] text-accent-dim">{item.total.toFixed(1)}</span>
          </button>
        );
      })}
    </div>
  );
}
