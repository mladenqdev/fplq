import { useMemo, useState } from 'react';
import { fdrBand, fdrColor, tickerScore, type FixtureDto, type TeamDto } from '@fplq/shared';
import { useBootstrap, useFixtures } from '../../lib/queries';
import { useBootstrapIndex } from '../../lib/bootstrap-index';
import { ErrorState, LoadingScreen } from '../../components/states';
import GwKickoffSheet from './GwKickoffSheet';

interface TeamFixture {
  opponent: number;
  isHome: boolean;
  difficulty: number;
}

function textOn(difficulty: number): string {
  return fdrBand(difficulty) === 'neutral' ? '#111111' : '#ffffff';
}

export default function FixturesPage() {
  const bootstrapQ = useBootstrap();
  const fixturesQ = useFixtures();
  const index = useBootstrapIndex(bootstrapQ.data);
  const [horizon, setHorizon] = useState<5 | 8>(5);
  const [easiestFirst, setEasiestFirst] = useState(true);
  const [openGw, setOpenGw] = useState<number | null>(null);

  const nextEvent = bootstrapQ.data?.nextEvent ?? bootstrapQ.data?.currentEvent ?? null;

  const gwList = useMemo(() => {
    if (nextEvent == null) return [];
    return Array.from({ length: horizon }, (_, i) => nextEvent + i);
  }, [nextEvent, horizon]);

  const rows = useMemo(() => {
    if (!bootstrapQ.data || !fixturesQ.data || gwList.length === 0) return [];
    const byTeamGw = new Map<string, TeamFixture[]>();
    const key = (team: number, gw: number) => `${team}:${gw}`;
    for (const f of fixturesQ.data) {
      if (f.event == null || !gwList.includes(f.event)) continue;
      const homeKey = key(f.teamH, f.event);
      const awayKey = key(f.teamA, f.event);
      if (!byTeamGw.has(homeKey)) byTeamGw.set(homeKey, []);
      if (!byTeamGw.has(awayKey)) byTeamGw.set(awayKey, []);
      byTeamGw
        .get(homeKey)!
        .push({ opponent: f.teamA, isHome: true, difficulty: f.teamHDifficulty });
      byTeamGw
        .get(awayKey)!
        .push({ opponent: f.teamH, isHome: false, difficulty: f.teamADifficulty });
    }

    const built = bootstrapQ.data.teams.map((team: TeamDto) => {
      const cells = gwList.map((gw) => byTeamGw.get(key(team.id, gw)) ?? []);
      const score = tickerScore(cells.map((c) => c.map((x) => x.difficulty)));
      return { team, cells, score };
    });

    built.sort((a, b) => (easiestFirst ? a.score - b.score : b.score - a.score));
    return built;
  }, [bootstrapQ.data, fixturesQ.data, gwList, easiestFirst]);

  if (bootstrapQ.isPending || fixturesQ.isPending)
    return <LoadingScreen label="Loading fixtures" />;
  if (bootstrapQ.isError || fixturesQ.isError || !index) {
    return (
      <ErrorState
        error={bootstrapQ.error ?? fixturesQ.error}
        onRetry={() => {
          bootstrapQ.refetch();
          fixturesQ.refetch();
        }}
      />
    );
  }

  const colWidth = horizon === 5 ? 'minmax(3.2rem,1fr)' : 'minmax(2.6rem,1fr)';
  const gridTemplate = `3.4rem repeat(${gwList.length}, ${colWidth})`;

  return (
    <div className="py-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fixtures</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEasiestFirst((v) => !v)}
            className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium active:opacity-70"
          >
            {easiestFirst ? 'Easiest' : 'Hardest'}
          </button>
          <div className="flex overflow-hidden rounded-full bg-surface2 text-xs font-medium">
            {([5, 8] as const).map((n) => (
              <button
                key={n}
                onClick={() => setHorizon(n)}
                className={`px-3 py-1.5 ${horizon === n ? 'bg-accent text-black' : 'text-muted'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar rounded-2xl border border-line bg-surface">
        <div className="min-w-full">
          <div
            className="sticky top-0 z-10 grid gap-1 border-b border-line bg-surface px-2 py-2"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span className="text-[10px] font-semibold uppercase text-faint">Team</span>
            {gwList.map((gw) => (
              <button
                key={gw}
                onClick={() => setOpenGw(gw)}
                className="text-center text-[10px] font-semibold text-muted active:text-accent"
              >
                GW{gw}
              </button>
            ))}
          </div>

          <div className="divide-y divide-line">
            {rows.map(({ team, cells }) => (
              <div
                key={team.id}
                className="grid items-center gap-1 px-2 py-1.5"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <span className="text-xs font-bold text-fg">{team.shortName}</span>
                {cells.map((cell, i) => (
                  <div key={gwList[i]} className="flex flex-col gap-0.5">
                    {cell.length === 0 ? (
                      <div className="rounded bg-surface2 py-1 text-center text-[10px] text-faint">
                        –
                      </div>
                    ) : (
                      cell.map((fx, j) => (
                        <div
                          key={j}
                          className="rounded py-1 text-center text-[10px] font-semibold leading-tight"
                          style={{
                            backgroundColor: fdrColor(fx.difficulty),
                            color: textOn(fx.difficulty),
                          }}
                        >
                          {index.teamShort(fx.opponent)}
                          <span className="opacity-80"> {fx.isHome ? 'H' : 'A'}</span>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-[11px] text-faint">
        Tap a GW header for kickoff times. Sorted by combined difficulty over {horizon} GWs.
      </p>

      <GwKickoffSheet
        gw={openGw}
        fixtures={fixturesQ.data}
        index={index}
        onClose={() => setOpenGw(null)}
      />
    </div>
  );
}
