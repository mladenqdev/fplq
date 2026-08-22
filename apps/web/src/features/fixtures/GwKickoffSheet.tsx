import type { FixtureDto } from '@fplq/shared';
import BottomSheet from '../../components/BottomSheet';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import { formatKickoff } from '../../lib/time';

interface Props {
  gw: number | null;
  fixtures: FixtureDto[];
  index: BootstrapIndex;
  onClose: () => void;
}

export default function GwKickoffSheet({ gw, fixtures, index, onClose }: Props) {
  const list = gw == null ? [] : fixtures.filter((f) => f.event === gw);
  const sorted = [...list].sort((a, b) => {
    const ta = a.kickoffTime ? new Date(a.kickoffTime).getTime() : Infinity;
    const tb = b.kickoffTime ? new Date(b.kickoffTime).getTime() : Infinity;
    return ta - tb;
  });

  return (
    <BottomSheet open={gw != null} onClose={onClose} title={gw != null ? `Gameweek ${gw}` : ''}>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No fixtures scheduled.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg bg-surface2 px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{index.teamShort(f.teamH)}</span>
                <span className="num text-muted">
                  {f.teamHScore != null && f.teamAScore != null
                    ? `${f.teamHScore}–${f.teamAScore}`
                    : 'v'}
                </span>
                <span>{index.teamShort(f.teamA)}</span>
              </div>
              <span className="num text-xs text-faint">{formatKickoff(f.kickoffTime)}</span>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
