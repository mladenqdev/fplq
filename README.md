# fplq

A personal Fantasy Premier League PWA. It combines live
overall rank with a trajectory chart, a 5 gameweek transfer planner, a fixture ticker,
and side-by-side player comparison. Mobile first, free hosting friendly.

The full spec and domain rules live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Layout

pnpm workspaces monorepo, TypeScript strict, ESM only.

- `packages/shared` (`@fplq/shared`) — FPL API types, our DTO types, and the pure,
  unit tested domain logic (bonus, fixture state, auto subs, live points, free
  transfers, prices, planner, FDR, formatting).
- `apps/api` (`@fplq/api`) — Hono + `@hono/node-server`. Proxies and caches the FPL
  API, computes the derived payloads, and samples rank history into SQLite
  (`node:sqlite`). Port 8787.
- `apps/web` (`@fplq/web`) — Vite + React 19 + Tailwind v4. Live rank, transfer planner, fixtures, comparison and settings, with an installable PWA shell. Port 5173, dev proxy `/api` -> `http://localhost:8787`.

## Requirements

- Node 22+ (developed on 23.4). `node:sqlite` is used without a flag.
- pnpm 11+.

## Run

```bash
pnpm install          # install all workspaces
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

pnpm dev              # api (8787) + web (5173) together
```

Individually:

```bash
pnpm --filter @fplq/api dev
pnpm --filter @fplq/web dev
```

## Scripts (root)

- `pnpm dev` — run api and web concurrently.
- `pnpm check` — `tsc --noEmit` in every package.
- `pnpm test` — run the vitest suites.
- `pnpm build` — build every package.
- `pnpm deploy` — build web assets and deploy the Cloudflare Worker/API. Does not commit or push Git changes.
- `pnpm format` / `pnpm format:check` — Prettier.

## Environment

`apps/api/.env` (see `.env.example`):

| Var                    | Default              | Meaning                                                   |
| ---------------------- | -------------------- | --------------------------------------------------------- |
| `PORT`                 | `8787`               | API port                                                  |
| `FPLQ_TRACKED_ENTRIES` | `1965441`            | Comma separated entry ids always sampled for rank history |
| `FPLQ_DB_PATH`         | `./data/fplq.sqlite` | SQLite file for rank samples (dir is created)             |

`apps/web/.env` (see `.env.example`):

| Var                     | Default   | Meaning                         |
| ----------------------- | --------- | ------------------------------- |
| `VITE_DEFAULT_ENTRY_ID` | `1965441` | Entry id prefilled on first run |

Commit `.env.example` only, never `.env`.

## API

All routes are under `/api`, JSON, gzip compressed, with an `X-Fetched-At` header (or a
`fetchedAt` field) describing FPL data freshness. Responses are cached in memory with
per route TTLs and served stale if the upstream fails. See section 4 of the architecture
doc for the full route table and DTOs. Quick check once running:

```bash
curl -s http://localhost:8787/api/health
curl -s http://localhost:8787/api/entry/1965441/live/1
```

## Current product

Production: https://fplq.fplq.workers.dev. One Cloudflare Worker serves the app and API, with rank history in D1; local development uses SQLite.

- Live rank compared with the overall rank at the start of the GW.
- Five-GW planner with a permanent candidate panel, unrestricted budget exploration, stable replacement slots, direct revert, Undo/Redo and explicit metric sorting.
- Dedicated two-player comparison with mobile pickers, grouped stats, Defcons per appearance and upcoming fixtures. Full individual stats remain available from the planner.

See [status and handoff](docs/STATUS.md) for deployment details and current limitations.
