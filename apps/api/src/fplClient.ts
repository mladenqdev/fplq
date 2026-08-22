// Single fetch wrapper for the FPL API: desktop UA, 10s timeout, one retry on
// network/5xx, JSON parse, and in-flight de-duplication by URL.

import type {
  FplBootstrap,
  FplFixture,
  FplLiveResponse,
  FplEventStatus,
  FplEntry,
  FplHistory,
  FplPicks,
  FplTransfer,
  FplElementSummary,
  FplLeagueStandings,
} from '@fplq/shared';

const BASE_URL = 'https://fantasy.premierleague.com/api/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const TIMEOUT_MS = 10_000;

export class UpstreamError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    message: string
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

const inFlight = new Map<string, Promise<unknown>>();

async function requestOnce<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 404) throw new UpstreamError(404, url, 'upstream returned 404');
    if (!res.ok) throw new UpstreamError(res.status, url, `upstream returned ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof UpstreamError) return err.status >= 500;
  return true; // network error or timeout abort
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = BASE_URL + path;
  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const run = (async () => {
    try {
      return await requestOnce<T>(url);
    } catch (err) {
      if (err instanceof UpstreamError && err.status === 404) throw err;
      if (!isRetryable(err)) throw err;
      return await requestOnce<T>(url);
    }
  })();

  inFlight.set(url, run);
  try {
    return await run;
  } finally {
    inFlight.delete(url);
  }
}

export const fpl = {
  bootstrap: () => fetchJson<FplBootstrap>('bootstrap-static/'),
  fixtures: () => fetchJson<FplFixture[]>('fixtures/'),
  fixturesByEvent: (gw: number) => fetchJson<FplFixture[]>(`fixtures/?event=${gw}`),
  live: (gw: number) => fetchJson<FplLiveResponse>(`event/${gw}/live/`),
  eventStatus: () => fetchJson<FplEventStatus>('event-status/'),
  entry: (id: number) => fetchJson<FplEntry>(`entry/${id}/`),
  entryHistory: (id: number) => fetchJson<FplHistory>(`entry/${id}/history/`),
  picks: (id: number, gw: number) => fetchJson<FplPicks>(`entry/${id}/event/${gw}/picks/`),
  transfers: (id: number) => fetchJson<FplTransfer[]>(`entry/${id}/transfers/`),
  element: (id: number) => fetchJson<FplElementSummary>(`element-summary/${id}/`),
  league: (id: number, page: number) =>
    fetchJson<FplLeagueStandings>(`leagues-classic/${id}/standings/?page_standings=${page}`),
};
