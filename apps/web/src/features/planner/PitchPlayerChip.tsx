import { formatPrice, type ElementDto } from '@fplq/shared';
import type { LineupPlayer } from './lineup';
import PlayerPhoto from '../../components/PlayerPhoto';
import FixtureStrip from '../../components/FixtureStrip';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { TeamGwFixtures } from '../../lib/team-fixtures';

interface Props {
  player: LineupPlayer;
  removed: boolean;
  onRemove: () => void;
  element: ElementDto | undefined;
  index: BootstrapIndex;
  fixtures: TeamGwFixtures[];
  replacedName: string | null;
  isCaptain: boolean;
  selected: boolean;
  compact: boolean;
  disabled: boolean;
  onClick: () => void;
  onRevert?: () => void;
}

export default function PitchPlayerChip({
  player,
  removed,
  onRemove,
  element,
  index,
  fixtures,
  replacedName,
  isCaptain,
  selected,
  compact,
  disabled,
  onClick,
  onRevert,
}: Props) {
  const name = element?.webName ?? String(player.element);
  return (
    <div className={`group relative w-[18%] max-w-32 min-w-0 ${disabled ? 'opacity-40' : ''}`}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={
          removed
            ? `Add ${index.typeShort(player.elementType)} in place of ${name}`
            : `Replace ${name}`
        }
        className={`relative flex w-full flex-col items-center rounded-lg border px-1 py-1 text-center shadow-sm transition-colors hover:border-brand ${removed ? 'border-dashed border-brand bg-surface/60' : selected ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-white/20 bg-surface/95'} lg:px-1.5`}
      >
        <div
          className={`${removed ? 'invisible' : ''} relative ${compact ? 'hidden lg:block' : ''} [@media(min-width:1024px)_and_(max-height:800px)]:hidden`}
        >
          {element && (
            <PlayerPhoto code={element.code} name={name} className="h-9 w-8 lg:h-12 lg:w-10" />
          )}
        </div>
        {isCaptain && !removed && (
          <span className="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-black text-black">
            C
          </span>
        )}
        {element && !removed && element.status !== 'a' && (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-warn" />
        )}
        <span
          className={`w-full truncate text-[10px] font-semibold lg:text-xs ${compact ? 'pt-2 lg:pt-0' : ''}`}
        >
          {removed ? `Add ${index.typeShort(player.elementType)}` : name}
        </span>
        <span className={`num text-[9px] text-muted ${removed ? 'invisible' : ''}`}>
          £{formatPrice(element?.nowCost ?? player.sellingPrice)}
        </span>
        <div
          className={`${removed ? 'invisible' : ''} ${compact ? 'hidden lg:block' : ''} my-1 w-full`}
        >
          <FixtureStrip gws={fixtures} index={index} />
        </div>
        <span
          className={`num text-[11px] font-bold text-accent lg:text-xs ${removed ? 'invisible' : ''}`}
        >
          {player.proj.toFixed(1)} <span className="text-[8px] font-normal text-muted">proj</span>
        </span>
      </button>
      <button
        onClick={onRevert ?? onRemove}
        disabled={disabled && !onRevert}
        aria-label={
          removed
            ? `Restore ${name}`
            : onRevert
              ? `Revert ${name} to ${replacedName}`
              : `Remove ${name}`
        }
        title={
          removed ? `Restore ${name}` : onRevert ? `Bring back ${replacedName}` : `Remove ${name}`
        }
        className={`absolute -right-1 -top-2 z-10 grid size-6 place-items-center rounded-full text-base font-bold text-white shadow transition-opacity focus-visible:outline-2 focus-visible:outline-white ${onRevert ? 'bg-down' : 'bg-surface2 [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} disabled:pointer-events-none`}
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
