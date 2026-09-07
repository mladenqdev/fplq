# fplq — status & handoff

Last updated: 2026-09-07. This is the running record of what exists and how it was built, so work can continue in a fresh session. For the full contract (FPL API facts, domain rules, DTOs, hosting) see [ARCHITECTURE.md](ARCHITECTURE.md).

## What it is

A personal Fantasy Premier League PWA for Mladen (FPL entry **1965441**). The headline feature is **live overall rank** (FPL also provides real-time rankings in 2026/27; fplq adds a sampled trajectory). Mobile-first, dark, FPL blue/green theme (no purple). Personal use now, possibly public later — so the backend is a cached proxy with no per-user secrets.

## Live

- **App (production):** https://fplq.fplq.workers.dev
- One Cloudflare Worker named `fplq` serves BOTH the web app (static assets) and the API (`/api/*`), same origin.
- Install on iPhone: open the URL in Safari → Share → Add to Home Screen.

## Stack & repo layout

pnpm workspaces monorepo, TypeScript strict, ESM.
- `packages/shared` (`@fplq/shared`) — FPL types, our DTOs, and ALL pure domain logic (bonus, auto-subs, live points, free transfers, prices, planner `derivePlan`, FDR, `projection`, formatters). Vitest: **85 shared tests pass**. No runtime deps; consumed as TS source.
- `apps/api` (`@fplq/api`) — Hono. Runs on TWO runtimes from one codebase:
  - Node (local dev): `src/index.ts` + `@hono/node-server` + `SqliteRankStore` (`node:sqlite`) + a `setInterval` sampler. Port 8787.
  - Cloudflare Workers (prod): `src/worker.ts` (`export default { fetch, scheduled }`) + `D1RankStore` + a Cron Trigger sampler. Serves web assets via the `ASSETS` binding.
  - Shared: `app.ts` (Hono app factory), `fplClient.ts` (UA + timeout + retry + in-flight dedupe), `cache.ts` (TTL + stale-while-error + liveness), `mappers/`, `routes/`, `builders/` (entryLive, squad), `sample.ts` (sampler core), `rankStore.ts` (interface) + `rankStore.sqlite.ts` / `rankStore.d1.ts`.
- `apps/web` (`@fplq/web`) — Vite + React 19 + TS + Tailwind v4 + TanStack Query + react-router + zustand + recharts + vite-plugin-pwa. Port 5173, dev-proxies `/api` → 8787.

## Commands

- `pnpm dev` — Node API (8787) + Vite web (5173) together. Open **http://localhost:5173** (Vite binds IPv6 localhost, not 127.0.0.1).
- `pnpm check` — tsc across all packages. `pnpm test` — vitest across shared, API and web. `pnpm build` — build all. `pnpm format` — prettier.
- `pnpm deploy` — build web + `wrangler deploy` (single-worker prod deploy).
- Env: local `apps/api/.env` (`PORT`, `FPLQ_TRACKED_ENTRIES=1965441`, `FPLQ_DB_PATH`) and `apps/web/.env` (`VITE_DEFAULT_ENTRY_ID=1965441`); both gitignored, `.env.example` committed. Prod web is same-origin (no `VITE_API_BASE`).

## Features built (all live)

- **Live tab**: live overall rank versus GW start overall rank, points/delta, averages, trajectory with explicit refresh/error/empty states, rank ladder, lineup and mini-leagues. Worker cache reuse, kickoff liveness and polling are fixed.
- **Planner tab**: permanent candidate browser beside the pitch on desktop, compact stacked mobile layout. Hover/touch × removes into a temporary slot; red × restores or reverts. Completed replacements retain the original pitch/bench slot. Undo/Redo/Reset, one- or three-GW fixtures, optional overview. Over-budget candidates remain selectable with negative bank shown. Sort by controls metric, value and direction without duplicate price/ownership. Full player stats are accessible in the panel. Projections include captain/chips/hits.
- **Fixtures tab**: FDR ticker, 5/8 GW toggle, sortable with blanks/doubles.
- **Compare tab** (`/players`): two visible selection cards with searchable position-filtered pickers, immediate side-by-side statistics and upcoming fixtures, sticky cards, clear/change controls. Mobile checked at 390×844 without horizontal overflow. Selection is page-local.
- **Defcons/game**: API aggregates defensive actions per actual fixture appearance, including substitutes and double GWs. Used by comparison, planner sorting and player details; missing data is not shown as zero.
- **Settings** — entry id, theme, clear cache.
- **PWA** — installable, offline shell, branded green→cyan "Q" favicon + icons (favicon.svg, icon-192/512, maskable, apple-touch).

## Projected points (planner) — it's an ESTIMATE

FPL provides no per-future-GW expected points. `packages/shared/src/projection.ts`: per-match base = max(epNext, epThis, pointsPerGame, form) clamped [0,15] (injured/suspended→0, doubtful→×0.5); per fixture multiplier = clamp(1 + (3 − difficulty)×0.15, 0.6, 1.4); summed across the GW's fixtures (DGW sums, BGW=0). The UI labels it "proj" / "EST." — do not present it as official.

## Cloudflare (account: mladjosq@gmail.com — the ALT account, not the primary)

- Account id: `b929ec12d512d002578badaea7f04620`. Subdomain: `fplq.workers.dev`.
- Worker: `fplq`. D1 database: `fplq`, id `0a849dea-9144-4cd0-bc84-8363fe6906ae` (in `apps/api/wrangler.toml`; migration `apps/api/migrations/0001_rank_samples.sql`).
- wrangler v4 authed on this machine via OAuth. FPL API accepts requests from Cloudflare Workers egress (verified with a throwaway probe — all 200).
- **Autodeploy (Workers Builds)** is connected to the GitHub repo. Deploy command MUST be `npx wrangler deploy -c apps/api/wrangler.toml` (plain `npx wrangler deploy` fails from the workspace root). **Status not yet confirmed working end-to-end**: the last push's autodeploy hadn't completed in the watch window, so that deploy was done manually (`pnpm deploy`). Confirm on the next push (Cloudflare dashboard → fplq → Builds), or fall back to `pnpm deploy`.

## Git

Repo: `github.com/mladenqdev/fplq` (public), branch `main`. Commits so far:
`initial fplq…` → `wire d1 database id…` → `add branded favicon and pwa icons` → `collapse to single worker serving web + api` → `add ffhub-style planner pitch and head-to-head player compare`.
Rule: never commit/push/branch without Mladen's explicit go-ahead each time.

## Known issues / rough edges to watch

- Autodeploy end-to-end unconfirmed (see above).
- Live headline points use FPL's official summary, which can lag the fresher live feed by a few points mid-match (by design — keeps points and rank consistent, matches the official app). "Our live estimate" line explains the gap.
- Initial planner XI and captain are selected automatically by projection; manual lineup/captain selection is not implemented. Completed transfers preserve original slots. Pending removals are temporary UI state and do not adjust the committed plan totals until replaced.
- Compare selection resets on navigation/reload. Mobile browser viewport was checked; an installed PWA with the real on-screen keyboard still needs device testing.
- Cache is per-isolate on Workers (each isolate has its own in-memory TTL cache) — fine, just more upstream calls; not shared across isolates in v1.

## Likely next steps

- Confirm/repair Workers Builds autodeploy on the next push.
- Optional: custom domain on the worker (nicer URL than `fplq.fplq.workers.dev`).
- Visual polish passes on planner pitch and compare on a real phone; possibly captain selection in the planner; richer per-GW history in compare.

## Deployment and verification: 2026-09-07

- Deployed web assets and API directly with `pnpm deploy` to https://fplq.fplq.workers.dev.
- Cloudflare version: `edd5d401-7cf0-45ec-af2f-adb86da7e908`; minute cron remains enabled.
- Production health returned `ok: true`, currentEvent 3 after deployment.
- Type checks and production builds pass. Test suites: 85 shared, 6 API, 9 web (100 total). UI checks covered over-budget transfer/revert/undo/redo, stable replacement slots, metric display and sort direction, and mobile comparison/picker.
- Deployment used the working tree. That manual deployment did not make a commit or push; VS Code showing modified files does not mean deployment failed. Documentation changes are local repository files and are not served as app assets.

- Requested normal workflow: commit and push the completed changes to `main`, then verify the automatic Workers Builds deployment. Future deployment requests should follow this Git workflow.
