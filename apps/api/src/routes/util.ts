import type { Context } from 'hono';

// Attach data freshness on every response (section 4), including array/raw payloads
// that cannot carry a `fetchedAt` field.
export function json<T>(c: Context, value: T, fetchedAt?: string) {
  if (fetchedAt) c.header('X-Fetched-At', fetchedAt);
  return c.json(value as object);
}

export function intParam(c: Context, name: string): number | null {
  const raw = c.req.param(name);
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}
