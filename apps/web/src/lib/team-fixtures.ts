import type { FixtureDto } from '@fplq/shared';

export interface TeamFixtureItem {
  id: number;
  opponent: number;
  isHome: boolean;
  difficulty: number;
}

export interface TeamGwFixtures {
  event: number;
  items: TeamFixtureItem[];
}

// Groups a team's fixtures by GW for `count` events starting at `fromEvent`. Empty
// `items` = a blank GW; two items = a double. Precompute the index once per fixture set.
export function buildTeamFixtureIndex(fixtures: FixtureDto[]): Map<string, TeamFixtureItem[]> {
  const map = new Map<string, TeamFixtureItem[]>();
  const push = (team: number, event: number, item: TeamFixtureItem) => {
    const key = `${team}:${event}`;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  };
  for (const f of fixtures) {
    if (f.event == null) continue;
    push(f.teamH, f.event, {
      id: f.id,
      opponent: f.teamA,
      isHome: true,
      difficulty: f.teamHDifficulty,
    });
    push(f.teamA, f.event, {
      id: f.id,
      opponent: f.teamH,
      isHome: false,
      difficulty: f.teamADifficulty,
    });
  }
  return map;
}

export function teamFixtures(
  index: Map<string, TeamFixtureItem[]>,
  team: number,
  fromEvent: number,
  count: number
): TeamGwFixtures[] {
  return Array.from({ length: count }, (_, i) => {
    const event = fromEvent + i;
    return { event, items: index.get(`${team}:${event}`) ?? [] };
  });
}
