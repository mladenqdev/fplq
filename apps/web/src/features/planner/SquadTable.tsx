import { useMemo } from 'react';
import { fdrBand, fdrColor, formatPrice, type DerivedGameweek } from '@fplq/shared';
import type { BootstrapIndex } from '../../lib/bootstrap-index';
import type { TransferTarget } from './TransferSheet';

const TYPE_LABEL: Record<number, string> = {
  1: 'Goalkeepers',
  2: 'Defenders',
  3: 'Midfielders',
  4: 'Forwards',
};

interface Props {
  gameweeks: DerivedGameweek[];
  index: BootstrapIndex;
  onOpen: (target: TransferTarget) => void;
}

function textOn(difficulty: number): string {
  return fdrBand(difficulty) === 'neutral' ? '#111111' : '#ffffff';
}

export default function SquadTable({ gameweeks, index, onOpen }: Props) {
  // Rows = every player appearing in any planned GW, grouped by position.
  const rows = useMemo(() => {
    const ids = new Set<number>();
    for (const gw of gameweeks) for (const el of gw.squad) ids.add(el);
    const list = [...ids].map((id) => {
      const el = index.elementById.get(id);
      const firstGw = gameweeks.find((gw) => gw.players.some((p) => p.element === id));
      const sell = firstGw?.players.find((p) => p.element === id)?.sellingPrice ?? el?.nowCost ?? 0;
      return {
        id,
        type: el?.elementType ?? 0,
        cost: el?.nowCost ?? 0,
        name: el?.webName ?? String(id),
        sell,
      };
    });
    list.sort((a, b) => a.type - b.type || b.cost - a.cost);
    return list;
  }, [gameweeks, index]);

  const grouped = useMemo(() => {
    const map = new Map<number, typeof rows>();
    for (const row of rows) {
      const arr = map.get(row.type) ?? [];
      arr.push(row);
      map.set(row.type, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  const gridTemplate = `7.5rem repeat(${gameweeks.length}, minmax(3rem, 1fr))`;

  return (
    <div className="overflow-x-auto no-scrollbar rounded-2xl border border-line bg-surface">
      <div style={{ minWidth: `${7.5 + gameweeks.length * 3}rem` }}>
        <div
          className="grid gap-1 border-b border-line bg-surface px-2 py-2 text-[10px] font-semibold uppercase text-faint"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span>Player</span>
          {gameweeks.map((gw) => (
            <span key={gw.event} className="text-center">
              GW{gw.event}
            </span>
          ))}
        </div>

        {grouped.map(([type, players]) => (
          <div key={type}>
            <div className="bg-surface2/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {TYPE_LABEL[type] ?? '—'}
            </div>
            {players.map((row) => (
              <div
                key={row.id}
                className="grid items-center gap-1 border-b border-line px-2 py-1.5"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-fg">{row.name}</div>
                  <div className="num text-[10px] text-faint">
                    {index.teamShort(index.elementById.get(row.id)?.team ?? 0)} · £
                    {formatPrice(row.sell)}
                  </div>
                </div>
                {gameweeks.map((gw) => {
                  const derivedPlayer = gw.players.find((p) => p.element === row.id);
                  if (!derivedPlayer) {
                    return (
                      <div
                        key={gw.event}
                        className="rounded bg-surface2/40 py-1 text-center text-[9px] text-faint"
                      >
                        ·
                      </div>
                    );
                  }
                  const target: TransferTarget = {
                    outElement: row.id,
                    event: gw.event,
                    budget: gw.bank + derivedPlayer.sellingPrice,
                    elementType: derivedPlayer.elementType,
                    squad: gw.squad,
                  };
                  return (
                    <button
                      key={gw.event}
                      onClick={() => onOpen(target)}
                      className="flex flex-col gap-0.5 active:opacity-70"
                    >
                      {derivedPlayer.fixtures.length === 0 ? (
                        <span className="rounded bg-surface2 py-1 text-center text-[9px] text-faint">
                          –
                        </span>
                      ) : (
                        derivedPlayer.fixtures.map((f) => (
                          <span
                            key={f.id}
                            className="rounded py-1 text-center text-[9px] font-semibold leading-tight"
                            style={{
                              backgroundColor: fdrColor(f.difficulty),
                              color: textOn(f.difficulty),
                            }}
                          >
                            {index.teamShort(f.opponent)}
                            <span className="opacity-80">{f.isHome ? 'H' : 'A'}</span>
                          </span>
                        ))
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="px-3 py-2 text-[11px] text-faint">
        Selling prices: tap any fixture cell to plan a transfer out that gameweek.
      </p>
    </div>
  );
}
