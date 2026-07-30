# FoodNote

Weight-loss planning and calorie tracking with AI-assisted meal logging.

Capstone project demonstrating: Node.js, NestJS, Next.js, PostgreSQL (TypeORM), Docker, GitHub Actions.

**Ticket board:** https://github.com/users/valentyn-vb/projects/5/views/1

## Structure

npm workspaces monorepo:

| Folder      | What it is                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `frontend/` | Next.js (App Router) + TypeScript + Tailwind — port **3000**            |
| `backend/`  | NestJS + TypeScript API — port **3001**, all routes under `/api`        |
| `shared/`   | `@foodnote/shared` — Zod schemas shared by both apps (the API contract) |

## Architecture

![System context](docs/architecture/01-system-context.png)

Browser → Next.js (`:3000`, proxies `/api/*`) → Nest API (`:3001`) → PostgreSQL,
with OpenAI called only from the meal-parse endpoint. Three more diagrams
(module map, the AI meal-parse request lifecycle, and the auth flow) are in
[`docs/architecture.md`](docs/architecture.md), each verified against the
running code rather than inferred from file names.

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

## Setup

```bash
npm install            # installs all three workspaces
cp .env.example .env   # local configuration — see Environment variables below
npm run db:up          # PostgreSQL 16 on localhost:5432 (Docker; waits for healthy)
npm run dev            # shared (watch) + backend (3001) + frontend (3000)
```

Open http://localhost:3000 — the page shows live backend status via `GET /api/health`.

Browse the API at http://localhost:3001/api/docs (Swagger UI); the raw OpenAPI spec is at http://localhost:3001/api/openapi.json.

## Demo account

`npm run seed -w backend` creates a demo account with 3 weeks of weight and
meal history, so the dashboard charts aren't empty on a fresh database. Safe
to run more than once — it's a no-op if the account already exists, not
additive. Credentials print to the console on a successful run (defaults:
`demo@foodnote.app` / `FoodNoteDemo!2026`, overridable via `SEED_DEMO_EMAIL` /
`SEED_DEMO_PASSWORD` in `.env`). Requires `npm run db:up` (or a reachable
`DATABASE_URL`) and migrations applied first.

## Environment variables

Every variable is documented in `.env.example`; the table below is the quick
reference. Required variables have no safe default and the app won't boot
without them (`ConfigService.getOrThrow`).

| Variable             | Required | Default (local)                                          | Notes                                                                                                                                         |
| -------------------- | -------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | no       | `3001`                                                   | Backend listen port.                                                                                                                          |
| `DATABASE_URL`       | **yes**  | `postgresql://foodnote:foodnote@localhost:5432/foodnote` | Points at Neon in production (set on Render, not in this repo).                                                                               |
| `JWT_ACCESS_SECRET`  | **yes**  | `dev-access-secret`                                      | Override for any real deployment.                                                                                                             |
| `JWT_REFRESH_SECRET` | **yes**  | `dev-refresh-secret`                                     | Override for any real deployment.                                                                                                             |
| `JWT_ACCESS_TTL`     | no       | `15m`                                                    |                                                                                                                                               |
| `JWT_REFRESH_TTL`    | no       | `7d`                                                     |                                                                                                                                               |
| `OPENAI_API_KEY`     | **yes**  | none                                                     | Powers `POST /meals/ai-parse` only. The API refuses to boot without it — see `.env.example` for where to get one.                             |
| `TRUST_PROXY_HOPS`   | no       | `0`                                                      | Proxy hops in front of the API; must match the real chain in production (Cloudflare + Render's load balancer) or per-IP rate limiting breaks. |
| `LOG_CLIENT_IP`      | no       | `false`                                                  | Set `true` once after a prod deploy to read the real `X-Forwarded-For` chain before setting `TRUST_PROXY_HOPS`.                               |
| `API_URL`            | no       | `http://localhost:3001`                                  | Where the Next.js dev server proxies `/api/*` to.                                                                                             |
| `SEED_DEMO_EMAIL`    | no       | `demo@foodnote.app`                                      | Only read by `npm run seed`.                                                                                                                  |
| `SEED_DEMO_PASSWORD` | no       | `FoodNoteDemo!2026`                                      | Only read by `npm run seed`.                                                                                                                  |

## Scripts (from the repo root)

| Command                            | Runs                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                      | shared (watch) + backend (`:3001`) + frontend (`:3000`), concurrently |
| `npm run build`                    | shared → backend → frontend, in dependency order                      |
| `npm test`                         | shared tests + backend tests (frontend has no test suite yet)         |
| `npm run format:check`             | Prettier check across the whole repo — must pass before a PR          |
| `npm run db:up`                    | Local PostgreSQL 16 in Docker, waits until healthy                    |
| `npm run db:down`                  | Stops the local database                                              |
| `npm run db:logs`                  | Tails the local database's logs                                       |
| `npm run seed -w backend`          | Demo account + 3 weeks of data — see Demo account above               |
| `npm run migration:run -w backend` | Applies pending migrations locally                                    |

## Deploy topology

Verified against `Dockerfile` and `.github/workflows/cd.yaml`, not assumed:

```
push to main ──► GitHub Actions ──► docker build (backend + shared only)
                                          │
                                    push to Docker Hub
                                          │
                                  POST Render deploy hook
                                          ▼
                          Render container: migration:run:prod,
                          then node dist/main.js
                                          │
                                    Neon (DATABASE_URL — set on
                                    Render, not in this repo)
```

Migrations do **not** auto-run in production on every boot — only the deploy
step above runs them, once, before the new container starts serving traffic
(`backend/README.md` has the full migration workflow).

**Frontend deployment is not wired into this repository** — no workflow step
builds or ships `frontend/`, and CI doesn't lint or test it (it has no test
suite). If a production frontend exists, it's deployed outside this repo
(e.g. a platform's own GitHub integration) and its URL isn't recorded here.

## Working rules

- `main` is protected: changes land via pull request with at least one review.
- Branches are short-lived (max 2 days) and reference a ticket from the board.
- Secrets live in `.env` only (git-ignored); `.env.example` documents every variable.
