import type { ElementDto, EntryLivePickDto } from '@fplq/shared';

interface Props {
  pick: EntryLivePickDto;
  element: ElementDto | undefined;
  teamShort: (id: number) => string;
  onClick: () => void;
}

const STATE_DOT: Record<string, string> = {
  not_started: 'bg-faint',
  live: 'bg-up pulse-dot',
  finished: 'bg-muted',
  blank: 'bg-faint',
};

// status: a available, d doubtful, i injured, s suspended, u/n unavailable.
function statusColor(status: string | undefined): string | null {
  if (!status || status === 'a') return null;
  if (status === 'd') return 'bg-warn';
  return 'bg-down';
}

function opponentText(pick: EntryLivePickDto, teamShort: (id: number) => string): string {
  if (pick.fixtureState === 'blank' || pick.fixtures.length === 0) return 'BLK';
  return pick.fixtures.map((f) => `${teamShort(f.opponent)} ${f.isHome ? 'H' : 'A'}`).join(', ');
}

export default function PlayerChip({ pick, element, teamShort, onClick }: Props) {
  const injury = statusColor(element?.status);
  const provisional = !pick.bonusConfirmed && pick.provisionalBonus > 0;
  const didNotPlay = pick.fixtureState === 'finished' && pick.minutes === 0;

  return (
    <button
      onClick={onClick}
      className={`relative flex w-[4.6rem] flex-col items-center rounded-lg border border-line bg-surface/90 px-1 pb-1 pt-1.5 text-center active:opacity-70 ${
        pick.subbedOut ? 'opacity-55' : ''
      }`}
    >
      <div className="absolute left-1 top-1 flex items-center gap-0.5">
        <span className={`size-1.5 rounded-full ${STATE_DOT[pick.fixtureState]}`} />
        {injury && <span className={`size-1.5 rounded-full ${injury}`} />}
      </div>
      <div className="absolute right-1 top-1 flex items-center gap-0.5">
        {pick.isCaptain && (
          <span className="grid size-4 place-items-center rounded-full bg-accent text-[9px] font-black text-black">
            C
          </span>
        )}
        {pick.isViceCaptain && (
          <span className="grid size-4 place-items-center rounded-full bg-surface2 text-[9px] font-black text-fg">
            V
          </span>
        )}
        {pick.subbedIn && <span className="text-[10px] leading-none text-up">▲</span>}
        {pick.subbedOut && <span className="text-[10px] leading-none text-down">▼</span>}
      </div>

      <div className="mt-3 max-w-full truncate text-[11px] font-semibold leading-tight text-fg">
        {pick.webName}
      </div>
      <div className="max-w-full truncate text-[9px] text-muted">
        {opponentText(pick, teamShort)}
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span
          className={`num text-sm font-bold leading-none ${didNotPlay ? 'text-faint' : 'text-fg'}`}
        >
          {pick.points}
        </span>
        {provisional && (
          <span className="num text-[9px] font-bold leading-none text-warn">
            +{pick.provisionalBonus}
          </span>
        )}
      </div>
    </button>
  );
}
