import { useMemo, useState } from 'react';
import { formatPrice } from '@fplq/shared';
import { useBootstrap, useFixtures, usePlayerDefcons } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { buildTeamFixtureIndex, teamFixtures } from '../../lib/team-fixtures';
import { ErrorState, LoadingScreen } from '../../components/states';
import BottomSheet from '../../components/BottomSheet';
import PlayerPhoto from '../../components/PlayerPhoto';
import FixtureStrip from '../../components/FixtureStrip';
import { COMPARE_GROUPS, bestValue, displayValue } from './compare';

export default function PlayersPage() {
  const bootstrapQ = useBootstrap();
  const fixturesQ = useFixtures();
  const index = useBootstrapIndex(bootstrapQ.data);
  const [ids, setIds] = useState<[number | null, number | null]>([null, null]);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState(0);
  const defconsQ = usePlayerDefcons(ids.some((id) => id != null));
  const fixtureIndex = useMemo(() => buildTeamFixtureIndex(fixturesQ.data ?? []), [fixturesQ.data]);
  const players = ids.map((id) => {
    const el = id == null ? undefined : index?.elementById.get(id);
    return el ? { ...el, defconsPerGame: defconsQ.data?.players[el.id]?.perGame } : null;
  });
  const chosen = players.filter((p) => p != null);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bootstrapQ.data?.elements ?? [])
      .filter(
        (el) =>
          (picking == null || el.id !== ids[picking === 0 ? 1 : 0]) &&
          (!position || el.elementType === position) &&
          (!q ||
            `${el.webName} ${el.firstName} ${el.secondName} ${index?.teamShort(el.team)}`
              .toLowerCase()
              .includes(q))
      )
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [bootstrapQ.data, index, search, position, picking, ids]);
  if (bootstrapQ.isPending) return <LoadingScreen label="Loading comparison" />;
  if (bootstrapQ.isError || !index)
    return <ErrorState error={bootstrapQ.error} onRetry={() => bootstrapQ.refetch()} />;
  const nextEvent = bootstrapQ.data?.nextEvent ?? bootstrapQ.data?.currentEvent ?? 1;
  const pick = (slot: 0 | 1) => {
    setSearch('');
    setPosition(0);
    setPicking(slot);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Compare players</h1>
          <p className="mt-1 text-xs text-muted">
            Pick two players to compare stats and upcoming fixtures.
          </p>
        </div>
        {chosen.length > 0 && (
          <button
            className="min-h-11 shrink-0 px-2 text-xs text-muted"
            onClick={() => setIds([null, null])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 grid grid-cols-2 gap-2 bg-bg py-2">
        {players.map((player, slot) => (
          <button
            key={slot}
            onClick={() => pick(slot as 0 | 1)}
            aria-label={player ? `Change ${player.webName}` : `Choose player ${slot + 1}`}
            className={`flex min-h-36 min-w-0 flex-col items-center justify-center rounded-2xl border p-3 text-center ${player ? 'border-line bg-surface' : 'border-dashed border-brand/50 bg-brand-soft'}`}
          >
            {player ? (
              <>
                <PlayerPhoto code={player.code} name={player.webName} className="h-12 w-10" />
                <span className="mt-1 w-full truncate text-sm font-bold">{player.webName}</span>
                <span className="text-[11px] text-muted">
                  {index.teamShort(player.team)} · {index.typeShort(player.elementType)} · £
                  {formatPrice(player.nowCost)}
                </span>
                <span className="mt-2 text-xs text-brand">Change player</span>
              </>
            ) : (
              <>
                <span className="mb-2 text-2xl text-brand">+</span>
                <span className="text-sm font-semibold">Choose player {slot + 1}</span>
                <span className="mt-1 text-xs text-muted">Search by name</span>
              </>
            )}
          </button>
        ))}
      </div>
      {chosen.length < 2 ? (
        <div className="rounded-2xl border border-line bg-surface px-5 py-8 text-center">
          <h2 className="text-base font-semibold">
            {chosen.length
              ? 'Who are you comparing them with?'
              : 'Your next decision, side by side'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Compare points, form, Defcons per game, attacking returns and value.
          </p>
          <button
            onClick={() => pick(ids[0] == null ? 0 : 1)}
            className="mt-5 min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-black"
          >
            {chosen.length ? 'Choose second player' : 'Choose first player'}
          </button>
        </div>
      ) : (
        <>
          {chosen.some((p) => p.news) && (
            <div className="space-y-2">
              {chosen
                .filter((p) => p.news)
                .map((p) => (
                  <p key={p.id} className="rounded-xl bg-warn/10 p-3 text-xs text-warn">
                    <strong>{p.webName}:</strong> {p.news}
                  </p>
                ))}
            </div>
          )}
          <section className="rounded-2xl border border-line bg-surface p-3">
            <h2 className="mb-3 text-sm font-semibold">Next 3 gameweeks</h2>
            {fixturesQ.isPending ? (
              <p className="text-xs text-muted">Loading fixtures…</p>
            ) : fixturesQ.isError ? (
              <button className="min-h-11 text-xs text-brand" onClick={() => fixturesQ.refetch()}>
                Retry fixtures
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {chosen.map((p) => (
                  <div key={p.id}>
                    <span className="mb-2 block truncate text-xs text-muted">{p.webName}</span>
                    <FixtureStrip
                      gws={teamFixtures(fixtureIndex, p.team, nextEvent, 3)}
                      index={index}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
          <p className="text-[11px] text-muted">
            Green highlights the stronger value; ties stay neutral. Lower is better for price and
            xGC. Ownership shows popularity, not quality.
            {chosen[0]?.elementType !== chosen[1]?.elementType &&
              ' These players play different positions.'}
          </p>
          {COMPARE_GROUPS.map((group) => (
            <section
              key={group.title}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <h2 className="bg-surface2 px-3 py-3 text-sm font-semibold">{group.title}</h2>
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-line text-[10px] text-muted">
                    <th className="w-[38%] p-2 text-left font-normal">Season stats</th>
                    {chosen.map((p) => (
                      <th key={p.id} className="truncate p-2 font-normal">
                        {p.webName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.stats.map((stat) => {
                    const best = stat.key === 'selectedByPercent' ? null : bestValue(stat, chosen);
                    return (
                      <tr key={stat.key} className="border-b border-line last:border-0">
                        <th className="px-3 py-3 text-left text-xs font-normal text-muted">
                          {stat.label}
                        </th>
                        {chosen.map((p) => (
                          <td
                            key={p.id}
                            className={`num px-1 py-3 text-center ${best != null && stat.value(p) === best ? 'font-semibold text-accent' : ''}`}
                          >
                            {displayValue(stat, p)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {group.title === 'Defence' && (defconsQ.isPending || defconsQ.isError) && (
                <p role="status" className="p-3 text-xs text-muted">
                  {defconsQ.isPending ? (
                    'Loading Defcons per game…'
                  ) : (
                    <button onClick={() => defconsQ.refetch()} className="min-h-11 text-brand">
                      Retry Defcons
                    </button>
                  )}
                </p>
              )}
            </section>
          ))}
        </>
      )}
      <BottomSheet
        open={picking != null}
        onClose={() => setPicking(null)}
        title={`Choose player ${(picking ?? 0) + 1}`}
      >
        <div className="space-y-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search comparison players"
            placeholder="Search player name or club"
            className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none focus:border-brand"
          />
          <div
            className="flex gap-1"
            role="group"
            aria-label="Filter comparison players by position"
          >
            {[0, 1, 2, 3, 4].map((type) => (
              <button
                key={type}
                aria-pressed={type === position}
                onClick={() => setPosition(type)}
                className={`min-h-11 flex-1 rounded-lg text-xs font-medium ${position === type ? 'bg-brand text-black' : 'bg-surface2 text-muted'}`}
              >
                {type ? index.typeShort(type) : 'All'}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">{candidates.length} players · most points first</p>
          <div className="max-h-[45dvh] overflow-y-auto divide-y divide-line">
            {candidates.length ? (
              candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (picking == null) return;
                    setIds((prev) => (picking === 0 ? [p.id, prev[1]] : [prev[0], p.id]));
                    setPicking(null);
                  }}
                  aria-label={`Compare ${p.webName}`}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left"
                >
                  <PlayerPhoto code={p.code} name={p.webName} className="h-10 w-8 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.webName}</span>
                    <span className="text-xs text-muted">
                      {index.teamShort(p.team)} · {index.typeShort(p.elementType)}
                    </span>
                  </span>
                  <span className="num text-sm">£{formatPrice(p.nowCost)}</span>
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                No matching players. Try another name or position.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
