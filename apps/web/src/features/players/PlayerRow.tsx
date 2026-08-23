import { formatPrice, type ElementDto } from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { SortKey } from './sorting';

interface Props {
  element: ElementDto;
  index: BootstrapIndex;
  sortKey: SortKey;
  onClick: () => void;
  selectable?: boolean;
  checked?: boolean;
  disabled?: boolean;
}

function statusDot(status: string): string | null {
  if (status === 'a') return null;
  if (status === 'd') return 'bg-warn';
  return 'bg-down';
}

function metric(el: ElementDto, key: SortKey): string {
  switch (key) {
    case 'nowCost':
      return `£${formatPrice(el.nowCost)}`;
    case 'selectedByPercent':
      return `${el.selectedByPercent}%`;
    case 'priceChangePercent':
      return `${el.priceChangePercent > 0 ? '+' : ''}${el.priceChangePercent}%`;
    case 'form':
    case 'epNext':
    case 'xgi90':
      return el[key].toFixed(1);
    default:
      return String(el[key]);
  }
}

export default function PlayerRow({
  element,
  index,
  sortKey,
  onClick,
  selectable = false,
  checked = false,
  disabled = false,
}: Props) {
  const dot = statusDot(element.status);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`cv-row flex w-full items-center gap-3 px-3 py-2 text-left active:bg-surface2 ${
        checked ? 'bg-accent/10' : disabled ? 'opacity-40' : ''
      }`}
    >
      {selectable && (
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
            checked ? 'border-accent bg-accent text-black' : 'border-line text-transparent'
          }`}
        >
          ✓
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-fg">{element.webName}</span>
          {dot && <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />}
        </div>
        <div className="text-[11px] text-faint">
          {index.teamShort(element.team)} · {index.typeShort(element.elementType)}
        </div>
      </div>
      <div className="num shrink-0 text-right">
        <div className="text-sm font-semibold text-fg">{metric(element, sortKey)}</div>
        <div className="text-[11px] text-faint">£{formatPrice(element.nowCost)}</div>
      </div>
    </button>
  );
}
