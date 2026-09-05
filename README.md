# DFML Tracker

Companion web app for **Dinasty Fantamanager League** (fantacalcio classic, 8 fantasy teams). Tracks the player pool, rosters, credits, market sessions, matchday scores/standings, league finances and season-by-season history — replacing a manual spreadsheet.

Built with Next.js 16 (App Router) + Drizzle ORM on Neon Postgres.

## Features

- **Players** — full Serie A listone (~600 players), position/team/name filters, per-player market value/FVM, transferred-out flag (kept, not deleted), embedded stats tab.
- **Rosters** — 25-player composition per fantasy team with role caps (3 GK / 8 DF / 8 MF / 6 FW), credit tracking, sale refund rule (`min(paid, FVM)`).
- **Market** — auction/repair-window sessions (initial auction, summer repair, winter repair, open market) as a pure log.
- **Trades** — cross-roster player/credit swaps, logged only (no validation logic by design).
- **Scores & Standings** — manual or scraped matchday votes, fantavoto computed from a fixed formula, standings driven by goals (not raw fantapoints).
- **Finance** — league fees, fines, prizes, end-of-season bonus credits.
- **History** — per-season market/matchday chronology; closing a season snapshots final standings and Serie A awards (top scorer, assist-man, clean-sheet leader).
- **External sync** (unofficial, best-effort):
  - `leghe.fantacalcio.it` — real match results (fantapoints + goals) for the league.
  - `fantacalcio.it` public voti pages — matchday votes/bonus-malus scraping.
  - `leghe.fantacalcio.it/servizi/fantaasta` — live listone feed (new players, team moves, transfers out of Serie A).

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in POSTGRES_URL at minimum
npm run db:migrate
npm run dev
```

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_URL` | yes | Neon/Postgres connection string |
| `SETTINGS_PASSWORD` | yes | Password behind the `/settings` page's modal |
| `SETTINGS_SESSION_SECRET` | yes | Signs the settings-page session cookie |

The leghe.fantacalcio.it App_Key/auth token (used for calendar, formations, results and the listone sync — same host and credentials for all of it) are **not** env vars — they expire and need updating without a redeploy, so they're stored in the DB and edited from the protected `/settings` page. Capture fresh ones from DevTools (`app_key` / `authorization` request headers) on a logged-in `leghe.fantacalcio.it` page if a sync starts returning 401.

The leghe.fantacalcio.it competition IDs (campionato, coppa) are **not** env vars either — they change every season and are set in the "Create Season" form, stored on the `seasons` row (`leagueCompetitionId`, `cupCompetitionId`).

## Scripts

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev/build/prod |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:import -- --players <listone.xlsx> --rosters <rose.csv> --season "<name>" --year <yyyy>` | One-off bulk import of the Serie A listone + team rosters (idempotent) |
| `npm run db:import-calendar` | Import the Serie A fixture calendar |

Ongoing listone/stats sync afterward runs from the app itself (Players page → "Sincronizza tutto"), not via scripts.

## Known gaps

No auth (the app is fully open — no per-manager login), no automated tests, no deployment pipeline yet (local dev only). See in-app roadmap notes for the rest.
