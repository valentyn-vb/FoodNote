# Presentation dry-run checklist (#42)

Run this against **production**, not localhost, at least once before
presenting. It exists to catch the gap between "the code is correct" and "the
live deploy actually works" — a green CI run and a working demo are different
claims. Terms below match `CONTEXT.md`.

**Production frontend URL:** https://food-note-frontend.vercel.app
(Vercel, deployed via GitHub App integration — see Deploy topology in the
root README. Confirmed live: serves the app and `/api/health` proxies
through to the Render backend.)

## Before the room fills up

- [ ] `POST /meals/ai-parse` responds (not a 500) — confirms `OPENAI_API_KEY`
      is actually set on Render, not just in your local `.env`
- [ ] Demo account seeded on the production database (Neon) — see
      **Running the seed script against Neon** below; this is a manual,
      one-time step, not something CI does
- [ ] Demo account logs in on the production frontend URL above

## Golden path

- [ ] Dashboard loads: Current Weight, Maintenance Calories, Calorie Target,
      and the Goal block (target weight, Projected Goal Date) all show
      non-null values
- [ ] Weight trend chart shows a declining line across roughly 3 weeks, not a
      flat or empty chart
- [ ] "Logged today" meals list shows entries (the seed script backdates
      history, but always includes today)
- [ ] 7-day calorie chart has bars for multiple days, not just today
- [ ] Log a meal manually (Manual Meal Entry) → totals move on the dashboard
- [ ] Log a meal via AI parse → preview appears, confirm → saved and totals
      move
- [ ] Type a clearly-not-food string into AI parse → the "not food" state
      shows (not an error toast — ADR-0006)
- [ ] Log a new Weight Entry → the trend chart's newest point updates
- [ ] Open the weight history drawer → edit one entry's weight → the point on
      the chart moves
- [ ] Settings → edit profile (age/sex/height/activity level) → Maintenance
      Calories recalculates
- [ ] Resize to a phone width → dashboard layout doesn't break (no known
      frontend test suite catches this — see README)

## Known, accepted gaps — say these out loud, don't let someone else find them

- Frontend has no automated tests. Everything above is manually checked
  because nothing else checks it yet.
- Frontend deployment isn't wired into this repo's CI/CD — if the production
  frontend URL above stops matching reality, this checklist goes stale
  silently.
- `TRUST_PROXY_HOPS` on Render must match the real Cloudflare + load-balancer
  chain or per-IP rate limiting breaks (see `.env.example`). Not verified as
  part of this checklist — a separate, one-time check per the same file's
  instructions.

## Running the seed script against Neon (human step, not automated)

This repo's seed script (`npm run seed -w backend`) only writes to whatever
`DATABASE_URL` is in scope when you run it — locally, that's the Docker
Postgres from `npm run db:up`. To seed the actual production database, run it
**from a machine with the real Neon `DATABASE_URL`** (the one set on Render,
not `.env.example`'s local default):

```bash
DATABASE_URL="<the real Neon connection string>" npm run seed -w backend
```

Whoever has Render/Neon dashboard access needs to do this — it's a deliberate
write to a real database, not something to run blind.
