# WC 2026 Sweepstake — `wcp-pro`

A secure, multi-user World Cup 2026 office sweepstake tracker. Built on Netlify
static hosting + Netlify Functions, with all API keys held server-side.

## What it does

- **Public site (`/`)** — read-only. Leaderboard of all 48 participants, live
  fixtures with filters, group tables, and cached AI match predictions. Stores
  nothing in the browser.
- **Admin (`/admin`)** — password-gated. Sync the schedule/results from
  football-data.org, force-refresh AI predictions, enter scores by hand, and
  override eliminations.
- **Shared state** — one small JSON document in Netlify Blobs, so all 48
  participants see the same data.
- **Auto-elimination** — eliminations are derived from results: 4th place of
  each completed group, the 4 worst third-placed teams, and knockout losers.
- **Hourly predictions** — a scheduled function refreshes AI predictions every
  hour; visitors only ever read the cached text (no client-side API calls).

## Architecture

```
Browser ──GET /api/state──▶ Netlify Functions ──▶ Netlify Blobs (shared state)
Admin   ──POST (cookie)───▶   (hold all secrets)  ├▶ api.anthropic.com
                                                  └▶ api.football-data.org
```

Functions:

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/state` | GET | public | Full view for the UI |
| `/api/state` | POST | admin | Manual scores / elimination overrides |
| `/api/login` | GET/POST | — | Session check / login / logout |
| `/api/sync` | POST | admin | Pull fixtures + results from football-data.org |
| `/api/predict` | POST | admin | Generate predictions now |
| `sync-scheduled` | cron | system | Sync fixtures + results every 15 min |
| `predict-scheduled` | cron | system | Hourly prediction refresh |

Pure logic lives in `lib/` (fully unit-tested); functions in
`netlify/functions/` are thin wrappers that add I/O and auth.

## Local development

```bash
npm install
# Fill in .env (see .env.example) — at minimum ADMIN_PASSWORD,
# ADMIN_SESSION_SECRET, FOOTBALL_DATA_API_KEY, ANTHROPIC_API_KEY
npm run dev          # netlify dev → http://localhost:8888
```

Then open the site, go to `/admin`, log in, and click **Sync now** to load the
schedule.

## Tests

```bash
npm test             # node --test (no external services hit)
```

Covers auth/sessions, team-name mapping, group standings + auto-elimination
(including best-thirds and knockouts), fixture transform/filters, prediction
prompt/parse, and state validation.

## Environment variables

Set these in `.env` for local dev and in the Netlify dashboard for production:

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | AI match predictions |
| `FOOTBALL_DATA_API_KEY` | Fixtures + live scores |
| `ADMIN_PASSWORD` | Unlocks `/admin` |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie |

## Deploy

1. `netlify login`
2. `netlify init` (or `netlify sites:create`) and link this folder
3. Set the four env vars: `netlify env:set NAME value` (or via the dashboard)
4. `netlify deploy --build --prod`
5. The site **auto-syncs every 15 minutes**, so it populates on its own shortly
   after deploy. To populate immediately, open `/admin`, log in, and **Sync now**.

The scheduled sync (every 15 min) and prediction (hourly) functions run
automatically once deployed.

## Notes

- Knockout pairings come from the football-data.org sync (source of truth), so
  the bracket is never hand-computed.
- `.env` is git-ignored; never commit real secrets.
