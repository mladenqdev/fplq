# fplq architecture and spec

Personal Fantasy Premier League PWA. Mobile first. Features the official app lacks: live overall rank with trajectory, a 5 gameweek transfer planner, fixture ticker, player explorer. Personal use first, public later without redesign. Hosting must be free tier.

This document is the source of truth for everyone (humans and agents) working on the repo. Keep it updated when the contract changes.

## 1. Stack and repo layout

- pnpm workspaces monorepo, TypeScript strict everywhere, ESM only.
- `packages/shared` (`@fplq/shared`): FPL API types, our API DTO types, pure domain logic (bonus, auto subs, free transfers, selling price, planner rules, FDR helpers). Unit tested with vitest. No runtime deps.
- `apps/api` (`@fplq/api`): Node 22+ (local: 23.4), Hono + `@hono/node-server`. Proxies and caches the FPL API, computes derived payloads, samples rank history into SQLite (`node:sqlite`, behind a small store interface so it can move to Cloudflare D1/KV later). Port 8787.
- `apps/web` (`@fplq/web`): Vite + React 19 + TypeScript, Tailwind CSS v4, TanStack Query, react-router (library mode), `vite-plugin-pwa` (Workbox), recharts for the rank chart. Port 5173, dev proxy `/api` -> `http://localhost:8787`.
- Root scripts: `pnpm dev` (api + web concurrently), `pnpm build`, `pnpm test`, `pnpm check` (tsc for every package).
- No ESLint in v1. Prettier config at root (2 spaces, no semicolons off: use default semicolons, single quotes, trailing commas es5, printWidth 100).
- Env: `apps/api/.env` (`PORT`, `FPLQ_TRACKED_ENTRIES=1965441`, `FPLQ_DB_PATH=./data/fplq.sqlite`), `apps/web/.env` (`VITE_DEFAULT_ENTRY_ID=1965441`). Commit `.env.example` files, never `.env`.

## 2. FPL API facts (verified 2026-08-22, GW1 live)

Base `https://fantasy.premierleague.com/api/`. Unofficial, no key for public data. No CORS headers, so the browser must go through our API. Works without a User-Agent from residential IPs; we still send a desktop browser UA. Prices in tenths of a million (`now_cost: 120` = 12.0m).

Endpoints we use:

| FPL endpoint                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bootstrap-static/`                                | `events`, `teams`, `element_types`, `elements` (600), `chips`, `game_config`, `game_settings`, `phases`, `total_players`. ~2 MB. Changes a few times a day, `elements` also during matches (event_points).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `fixtures/` and `fixtures/?event=N`                | All 380 fixtures. Fields: `id, code, event, kickoff_time, started, finished, finished_provisional, minutes, provisional_start_time, team_h, team_a, team_h_score, team_a_score, team_h_difficulty, team_a_difficulty, stats[]`. `stats` entries: `{identifier, h: [{value, element}], a: [...]}` with identifiers `goals_scored, assists, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, defensive_contribution`. `bps` lists every player with bps in that fixture. `bonus` is empty before kickoff and can be populated provisionally once a match is under way (verified live 2026-08-22); it is final once `event-status` reports `bonus_added`.                                                                                                                                                                                                                                                                                                  |
| `event/{gw}/live/`                                 | `elements[]: {id, stats, explain[]}`. `stats` has `minutes, goals_scored, assists, clean_sheets, goals_conceded, own_goals, penalties_saved, penalties_missed, yellow_cards, red_cards, saves, bonus, bps, influence, creativity, threat, ict_index, clearances_blocks_interceptions, recoveries, tackles, defensive_contribution, starts, expected_goals, expected_assists, expected_goal_involvements, expected_goals_conceded, total_points, in_dreamteam, played`. `explain[]: {fixture, stats: [{identifier, points, value, points_modification}]}`. the live `bonus` and `total_points` are populated provisionally during a match (verified live 2026-08-22), so `total_points` already includes provisional bonus; they are final once `event-status` reports `bonus_added`. Rule 3.1 only adds our own projected bonus when the fixture `bonus` stat is still empty. In a double GW `bps` and points are summed across fixtures, so per fixture bps must come from `fixtures/?event=N`. |
| `entry/{id}/`                                      | `name, player_first_name, player_last_name, current_event, started_event, summary_overall_points, summary_overall_rank, summary_event_points, summary_event_rank, last_deadline_bank, last_deadline_value, last_deadline_total_transfers, leagues.classic[] {id, name, entry_rank, entry_last_rank, rank_count, league_type}, player_region_name, years_active, favourite_team, kit`. **The `summary_*` fields update live during matches (2026/27 real time rankings).** This is the source of live overall rank.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `entry/{id}/history/`                              | `current[] {event, points, total_points, rank, rank_sort, overall_rank, percentile_rank, overall_rank_percentage, bank, value, event_transfers, event_transfers_cost, points_on_bench}`, `past[] {season_name, total_points, rank, rank_percentage}`, `chips[] {name, time, event}`. `current` lags behind `entry/` during live play.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `entry/{id}/event/{gw}/picks/`                     | `active_chip` (null, `wildcard`, `freehit`, `bboost`, `3xc`), `automatic_subs[] {entry, element_in, element_out, event}`, `entry_history` (same shape as a `history.current` row, also lags), `picks[] {element, position 1..15, multiplier 0..3, is_captain, is_vice_captain}`. Public after the GW deadline. 404 before the entry's first GW.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `entry/{id}/transfers/`                            | `[] {element_in, element_in_cost, element_out, element_out_cost, entry, event, time}` newest first.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `element-summary/{id}/`                            | `fixtures[] {id, code, team_h, team_a, event, finished, minutes, kickoff_time, event_name, is_home, difficulty}` (upcoming), `history[]` (per GW rows incl. `value, selected, transfers_in, transfers_out`), `history_past[]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `leagues-classic/{id}/standings/?page_standings=N` | `league {id, name, ...}`, `standings {has_next, page, results[] {entry, entry_name, player_name, event_total, total, rank, rank_sort, last_rank}}`, 50 per page. League 314 is the global "Overall" league and is live, so `page = ceil(rank / 50)` gives the score at any rank.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `event-status/`                                    | `status[] {bonus_added, date, event, points: ""                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | "l" | "p" | "r"}`, `leagues`. |

Season rules 2026/27 (from `bootstrap-static`): squad 15 (2 GKP, 5 DEF, 5 MID, 3 FWD), max 3 per club, budget 100.0m, valid XI has 1 GKP, 3 to 5 DEF, 2 to 5 MID, 1 to 3 FWD. Free transfers: 1 added per GW, bank up to 5 (`max_extra_free_transfers`), hits cost 4 each. Chips: two of each, first set GW1/2 to 19, second set GW20 to 38 (`chips[]` has `start_event`, `stop_event`, names `wildcard`, `freehit`, `bboost`, `3xc`; wildcard and freehit start GW2). Price change deadlines are listed in `game_config.settings.price_change_deadlines`. A GW locks (scores final) at 09:00 UK the day after its last match.

Useful new element fields: `ep_next`, `ep_this` (FPL expected points), `price_change_percent`, `price_change_projections[] {offset 0..2, projected_percent, likelihood -5..5}`, `price_change_hourly_rate`, `price_change_locked_until`, `defensive_contribution`, `scout_risks`, `penalties_order`, `corners_and_indirect_freekicks_order`, `direct_freekicks_order`, xG/xA/xGI/xGC plus `_per_90` variants, `form`, `points_per_game`, `selected_by_percent`, `transfers_in_event`, `transfers_out_event`, `status` (a available, d doubtful, i injured, s suspended, u unavailable, n not in squad), `chance_of_playing_next_round`, `news`, `news_added`, `photo`, `code`.

Player photo: `https://resources.premierleague.com/premierleague/photos/players/110x140/p{code}.png`. Shirt images are not needed in v1.

## 3. Domain rules (implemented in `@fplq/shared`, unit tested)

### 3.1 Provisional bonus

Per fixture, rank players by bps descending using standard competition ranking (1, 1, 3 on a tie for first). Points: rank 1 -> 3, rank 2 -> 2, rank 3 -> 1, else 0. This reproduces the official tie rules (tie for first: 3, 3, 1; tie for second: 3, 2, 2; tie for third: 3, 2, 1, 1). Only players with `bps > 0` count. Apply only when the fixture has `started` and its `bonus` stat is still empty; once `bonus` is present use the official values. Input: the fixture `stats` arrays. Output: `Map<elementId, bonus>` per fixture.

### 3.2 Fixture state for a player in a GW

`not_started` (no fixture started), `live` (some fixture started and not finished_provisional), `finished` (all fixtures of the player's team in this GW are `finished_provisional`), `blank` (team has no fixture in the GW). A player "did not play" only when state is `finished` and `minutes === 0`.

### 3.3 Auto subs (projected)

Skip entirely when `active_chip === 'bboost'`. Otherwise, starters are positions 1 to 11, bench 12 (GK) then 13, 14, 15 in priority order. GK: if the starting GK did not play and the bench GK played, swap. Outfield: for each bench outfield player in order who played, find the first starter (position order) who did not play such that swapping keeps the XI valid (3 to 5 DEF, 2 to 5 MID, 1 to 3 FWD, exactly 1 GK); perform the swap and continue with the next bench player. Subs are only "projected" while fixtures are live; they become firm when the GW is finished. The API reports both the official `automatic_subs` from FPL (present after FPL processes them) and our projection; the UI shows FPL's when present.

### 3.4 Captain

If the captain did not play (rule 3.2) and the vice captain played (or their fixture is not finished yet), the vice captain receives the captain multiplier (2, or 3 with `3xc`). If neither plays, nobody gets it. Multiplier from picks: captain 2 (3 with 3xc), others 1, bench 0 unless bboost (bench multiplier 1).

### 3.5 Live team points

For each pick: `points = (official total_points from event live) + (provisional bonus if applicable)`; team total = sum over the effective XI after projected auto subs of `points * effective multiplier`, minus `event_transfers_cost`. Also report `pointsOnBench`. The official headline (`summary_event_points`) is authoritative and shown as the main number; our breakdown is explanatory and may differ slightly.

### 3.6 Free transfers

GW1 is unlimited. For GW g >= 2: `ft(2) = 1`. For g > 2: if the entry played `wildcard` or `freehit` in g-1 then `ft(g) = min(5, ft(g-1) + 1)`; otherwise `ft(g) = min(5, max(ft(g-1) - transfersMade(g-1), 0) + 1)`. Entries that joined late start with 1 at their `started_event + 1`. Inputs: `history.current[]` (`event_transfers`) and `history.chips[]`.

### 3.7 Purchase and selling price

Initial squad purchase price = `now_cost - cost_change_start` (start of season price). Transferred in players: `element_in_cost` from the transfers endpoint (latest transfer for that element after the last time it left the squad). Selling price = `purchase + floor((now - purchase) / 2)` when `now > purchase` (tenths of a million, profit rounded down per 0.2 rise), else `now`. Squad value for the planner uses selling prices; bank from the latest `entry_history.bank`.

### 3.8 Planner model

```
type PlannerPlan = {
  entryId: number
  baseEvent: number            // the GW whose picks are the starting squad (latest GW with picks)
  horizon: number              // 5
  gameweeks: Record<number, {  // key = GW id, baseEvent+1 ... baseEvent+horizon
    transfers: { out: number; in: number }[]
    chip: 'wildcard' | 'freehit' | 'bboost' | '3xc' | null
  }>
  updatedAt: string
}
```

Derived per GW in order: squad (15 element ids, free hit squads revert the next GW), bank, free transfers available (rule 3.6 continued forward, wildcard and freehit do not consume FTs), transfers made, hit cost `max(0, made - ft) * 4` (0 on wildcard or freehit), validity problems (more than 3 from one club, wrong position counts, negative bank, duplicate player, chip not available in that window or already used), plus per player the fixture list for that GW. Transfers in are bought at `now_cost`; transfers out sell at selling price. Persist plans in `localStorage` under `fplq.plan.{entryId}`.

### 3.9 FDR

Use `team_h_difficulty` / `team_a_difficulty` from fixtures (1 to 5). Colors: 1 and 2 green, 3 grey, 4 red-ish, 5 dark red. Ticker score for a team over a range = sum of difficulties, blanks count 5, doubles sum both.

## 4. Our API (`apps/api`)

All routes under `/api`. JSON, compressed. Every response includes `fetchedAt` (ISO) describing the FPL data freshness. Errors: `{ error: string }` with proper status; upstream 404 -> 404, upstream failure -> 502, never crash. Cache is in memory keyed by route + params with TTL; stale data is served if the upstream fails (stale-while-error). TTLs below are "while live" / "otherwise"; live means any fixture of the current GW has `started && !finished` (tracked from the fixtures cache, re-evaluated each minute).

| Route                                 | Source                                          | TTL (live / idle)                                                            | Response                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                     |                                                 |                                                                              | `{ ok: true, live: boolean, currentEvent, uptimeSec }`                                                                                                                                                                                    |
| `GET /api/bootstrap`                  | bootstrap-static                                | 2 min / 10 min                                                               | `BootstrapDto` (slimmed, see below)                                                                                                                                                                                                       |
| `GET /api/fixtures`                   | fixtures/                                       | 2 min / 10 min                                                               | `FixtureDto[]` without stats                                                                                                                                                                                                              |
| `GET /api/fixtures/:gw`               | fixtures/?event                                 | 45 s / 10 min (immutable once all finished and bootstrap event data_checked) | `FixtureDto[]` with `stats` and derived `provisionalBonus: {element, bonus}[]` per fixture                                                                                                                                                |
| `GET /api/live/:gw`                   | event/{gw}/live                                 | 45 s / 10 min                                                                | `{ event, fetchedAt, elements: Record<id, LiveElementDto> }`                                                                                                                                                                              |
| `GET /api/event-status`               | event-status                                    | 60 s / 10 min                                                                | raw status                                                                                                                                                                                                                                |
| `GET /api/entry/:id`                  | entry/{id}                                      | 30 s / 5 min                                                                 | `EntryDto`                                                                                                                                                                                                                                |
| `GET /api/entry/:id/history`          | entry history                                   | 2 min / 10 min                                                               | `{ current, past, chips, freeTransfers: {event, available: number                                                                                                                                                                         | null}[] }`(free transfers derived via rule 3.6 for every GW up to next;`available`is`null` for the entry's first GW, which is unlimited) |
| `GET /api/entry/:id/picks/:gw`        | picks                                           | 60 s / immutable when GW data_checked                                        | raw picks + `entry_history`                                                                                                                                                                                                               |
| `GET /api/entry/:id/transfers`        | transfers                                       | 2 min / 10 min                                                               | raw list                                                                                                                                                                                                                                  |
| `GET /api/entry/:id/live/:gw`         | picks + live + fixtures + entry + bootstrap     | 30 s / 5 min                                                                 | `EntryLiveDto` (the Live tab payload, see below)                                                                                                                                                                                          |
| `GET /api/entry/:id/rank-history/:gw` | sqlite                                          | none                                                                         | `{ samples: { t: string; overallRank: number; overallPoints: number; eventPoints: number; eventRank: number                                                                                                                               | null }[] }`                                                                                                                              |
| `GET /api/entry/:id/squad`            | picks(latest) + transfers + bootstrap + history | 60 s / 5 min                                                                 | `SquadDto` (planner starting point: 15 players with purchase and selling price, bank, free transfers for next GW, chips used, baseEvent, nextEvent)                                                                                       |
| `GET /api/overall/ladder`             | leagues-classic/314 pages                       | 2 min / 15 min                                                               | `{ event, fetchedAt, rungs: { rank: number; total: number; eventTotal: number }[] }` for ranks `[1000, 10000, 50000, 100000, 250000, 500000, 1000000, 2000000, 3000000, 5000000]` (fetch pages in parallel, tolerate individual failures) |
| `GET /api/league/:id?page=1`          | leagues-classic                                 | 60 s / 10 min                                                                | raw league + standings page                                                                                                                                                                                                               |
| `GET /api/element/:id`                | element-summary                                 | 10 min                                                                       | raw                                                                                                                                                                                                                                       |

DTOs (exact TypeScript lives in `packages/shared/src/dto.ts`):

- `BootstrapDto`: `{ fetchedAt, totalPlayers, currentEvent, nextEvent, events: EventDto[], teams: TeamDto[], elementTypes: ElementTypeDto[], elements: ElementDto[], chips: ChipDto[], rules: { squadTeamLimit, squadTotalSpend, maxFreeTransfers, transfersCap, sellOnFee }, priceChangeDeadlines: string[] }`
  - `EventDto`: `id, name, deadlineTime, finished, dataChecked, isCurrent, isNext, isPrevious, averageEntryScore, highestScore, rankedCount, chipPlays, mostCaptained, mostSelected`
  - `TeamDto`: `id, code, name, shortName, strengthOverallHome, strengthOverallAway, strengthAttackHome, strengthAttackAway, strengthDefenceHome, strengthDefenceAway`
  - `ElementDto`: `id, code, webName, firstName, secondName, team, elementType, nowCost, costChangeStart, costChangeEvent, status, news, newsAdded, chanceOfPlayingNextRound, selectedByPercent (number), totalPoints, eventPoints, form (number), pointsPerGame (number), minutes, starts, goalsScored, assists, cleanSheets, goalsConceded, bonus, bps, yellowCards, redCards, saves, defensiveContribution, ictIndex (number), xg, xa, xgi, xgc, xg90, xa90, xgi90, xgc90 (numbers), epNext, epThis (numbers), priceChangePercent (number), priceChangeProjections: {offset, projectedPercent (number), likelihood}[], transfersInEvent, transfersOutEvent, photo, penaltiesOrder, cornersOrder, directFreekicksOrder, scoutRisks`
  - `ChipDto`: `id, name, startEvent, stopEvent, chipType`
- `FixtureDto`: `id, code, event, kickoffTime, started, finished, finishedProvisional, minutes, teamH, teamA, teamHScore, teamAScore, teamHDifficulty, teamADifficulty, stats?: { identifier, h: {element, value}[], a: {element, value}[] }[], provisionalBonus?: { element, bonus }[]`
- `LiveElementDto`: `id, stats (as FPL), explain (as FPL)`
- `EntryDto`: `id, name, playerName, regionName, currentEvent, startedEvent, overallPoints, overallRank, eventPoints, eventRank, lastDeadlineBank, lastDeadlineValue, lastDeadlineTotalTransfers, leagues: {id, name, entryRank, entryLastRank, rankCount, leagueType}[], fetchedAt`
- `EntryLiveDto`:
  ```
  {
    fetchedAt, event, entry: EntryDto,
    isLive: boolean, gwFinished: boolean,
    official: { eventPoints, overallRank, eventRank, overallPoints },      // from entry/
    previous: { overallRank: number | null, overallPoints: number | null }, // last finished GW from history
    activeChip, transfersCost, pointsOnBench,
    computedPoints: number,                                                // rule 3.5
    picks: {
      element, position, multiplier, effectiveMultiplier, isCaptain, isViceCaptain,
      webName, team (id), elementType, nowCost, photo,
      points, officialPoints, provisionalBonus, bonusConfirmed, bps, minutes,
      fixtureState: 'not_started' | 'live' | 'finished' | 'blank',
      fixtures: { id, opponent (team id), isHome, started, finishedProvisional, minutes, kickoffTime, score: string | null }[],
      explain: { identifier, points, value }[],   // flattened over fixtures
      subbedIn: boolean, subbedOut: boolean       // projected or official
    }[],
    autoSubs: { in: number; out: number; official: boolean }[]
  }
  ```
- `SquadDto`: `{ fetchedAt, entryId, baseEvent, nextEvent, bank, freeTransfers, chipsUsed: {name, event}[], players: { element, position, purchasePrice, sellingPrice, nowCost }[], activeChipBase }`

Rank sampler: a scheduler in the API process. Tracked entries = `FPLQ_TRACKED_ENTRIES` plus any entry requested via `/api/entry/:id/live/:gw` in the last 24 h (cap 50). While live: sample every 60 s (one `entry/{id}` request per tracked entry, shared with the cache). While idle: every 15 min. Store rows `(entry, event, t, overall_rank, overall_points, event_points, event_rank)` in SQLite (`node:sqlite`), skip writing when nothing changed since the last sample. Store behind a `RankStore` interface (`append`, `list(entry, event)`), implementation `SqliteRankStore` (file path from env, create dir). Keep the FPL client in one module (`fplClient.ts`) with a single fetch wrapper (UA header, timeout 10 s, retry once on 5xx/network, JSON parse). Concurrency: dedupe in-flight upstream requests for the same URL.

## 5. Web app (`apps/web`)

Mobile first, dark theme by default with a light theme following the system (class strategy with a toggle in Settings). Bottom tab bar: Live, Planner, Fixtures, Players, plus a gear for Settings. Top bar: app name, current GW, deadline countdown to the next GW ("2d 4h"). First run: if no entry id stored, show a small screen asking for it (default from `VITE_DEFAULT_ENTRY_ID`), store in `localStorage` key `fplq.entryId`.

Data layer: TanStack Query with a thin typed client (`api.ts`) over `/api`. `staleTime` mirrors the API TTLs; during live (per `EntryLiveDto.isLive` or `/api/health`) the Live tab refetches every 60 s, also on window focus. Show the data freshness ("updated 12 s ago") in the Live header.

### Live tab (`/`)

1. Header card: live GW points (official), overall rank with arrow and delta vs `previous.overallRank` (green up, red down), GW rank, GW average and highest, chip badge, hits, freshness. Rank formatting: `794,510`; compact `795k` where tight.
2. Rank trajectory: line chart of `overallRank` samples for this GW (y inverted: lower rank is higher on screen), x = time; show "no samples yet" gracefully. Use the rank-history endpoint.
3. Rank ladder: compact list of rungs (top 10k, 50k, 100k, ...) with the points at each rung and the gap from the user's overall points (`+3 to reach 500k`, or `you are above`). Highlight the nearest rungs.
4. Pitch: XI in formation rows plus bench row. Each player chip: web name, opponent short (H/A), points (bold), provisional bonus marker (e.g. `+2b` in amber when not confirmed), captain/vice badge, minutes state (dot: grey not started, green live, done finished), injury/doubt flag from bootstrap status, auto-sub arrows. Tap opens a bottom sheet with the explain breakdown and fixtures.
5. Points on bench and computed total vs official (small text).
6. Mini-leagues: list of the entry's classic leagues with rank and movement (entry_rank vs entry_last_rank), tap to a simple standings page (`/league/:id`) using `/api/league/:id`.

### Planner tab (`/planner`)

Starting point from `/api/entry/:id/squad`. Horizon 5 GWs from `nextEvent`. Layout: a horizontally scrollable GW header (GW number, deadline date, FT available, hits, bank after transfers, chip selector) and a squad table grouped by position: name, club, selling price, then one cell per GW with opponent and FDR color. Tapping a cell (player x GW) opens the transfer sheet: list of candidates for that position (search, sort by ep_next, total points, form, price, ownership; filter by max price derived from bank + selling price), each row shows price, ep_next, ownership, price change % with projection arrow, next 5 fixtures strip, news. Selecting makes a transfer in that GW. Transfers are listed under each GW with a remove button. Chips per GW with availability checks. Validity problems shown inline. Reset plan. All state in localStorage via a small store (zustand or useReducer + effect; choose zustand for simplicity). Everything derived via `@fplq/shared` planner functions.

### Fixtures tab (`/fixtures`)

FDR ticker: rows teams, columns next N GWs (5, toggle to 8, starting at next GW), cell opponent short name with H/A and difficulty color; sort by ticker score; blanks and doubles visible. Tap a GW header to show kickoff list for that GW.

### Players tab (`/players`)

List with sticky filter bar: position, team, max price, search; sort by points, form, ep_next, price, ownership, xGI/90, minutes, price change %. Virtualize if needed (600 rows; simple windowing or `content-visibility` is fine). Tap opens detail sheet: photo, status/news, season stats, last 5 GW rows (from `/api/element/:id` history), next 5 fixtures, price projection.

### Settings (`/settings`)

Entry id (change), theme, about, cache clear (unregister SW + reload).

### PWA

`vite-plugin-pwa` with `registerType: 'autoUpdate'`, manifest name `fplq`, short_name `fplq`, theme color matching the dark background, display standalone, start_url `/`, icons 192 and 512 (generate simple SVG-based PNGs in `public/`, a bold "Q" on purple is fine). Workbox runtime caching: `/api/**` NetworkFirst with 10 s timeout and max age 1 h, images CacheFirst. App shell precached.

### Design notes

Clean, dense but readable on a phone, one accent color (green `#00ff87`-like FPL green tuned for contrast on dark, and a purple for headers), system font stack, tabular numbers for points and ranks, no decorative noise. Touch targets 44 px. Avoid layout shift on refetch (keep previous data while loading).

## 6. Conventions

- TypeScript strict, no `any` unless at the FPL boundary (typed there once).
- Domain logic only in `@fplq/shared`, pure and tested. API and web import it.
- No comments that restate names; comment only non-obvious rules (cite the rule number from this doc).
- Small files, one component per file, colocate hooks.
- Commit messages lowercase, short. Never commit or push without Mladen's go-ahead.

## 7. Free hosting plan (later)

- Web: Cloudflare Pages (or Vercel/Netlify free). Needs HTTPS for PWA install on iPhone.
- API: Cloudflare Workers free tier (Hono runs there; swap `node:sqlite` for D1 via `RankStore`, scheduler via Cron Triggers) if the FPL API accepts Worker egress; otherwise Render free web service or an Oracle Always Free VM. Keep the Node build host agnostic: no filesystem assumptions outside `FPLQ_DB_PATH`.
