import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type {
  FplBootstrap,
  FplLiveResponse,
  FplFixture,
  FplPicks,
  FplHistory,
  FplEntry,
} from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf8')) as T;
}

export const bootstrap = load<FplBootstrap>('bootstrap-slim.json');
export const live = load<FplLiveResponse>('live-gw1.json');
export const fixtures = load<FplFixture[]>('fixtures-gw1.json');
export const picks = load<FplPicks>('picks-gw1.json');
export const history = load<FplHistory>('history.json');
export const entry = load<FplEntry>('entry.json');

export const liveById = new Map(live.elements.map((e) => [e.id, e]));
export const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));
export const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
