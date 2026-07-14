# FoodNote — Project Summary (as of 2026-07-13, end of day 1)

## Project

FoodNote (`valentyn-vb/FoodNote`, public) — 4-person student capstone, 4 weeks (due ~2026-08-10): weight-loss planning and calorie tracking with AI-assisted meal logging, based on the "GoalTrack MVP plan v2" document. Demonstrates course tech: Node.js, NestJS, Docker, Next.js, GitHub Actions. Tickets: [GitHub Project board #5](https://github.com/users/valentyn-vb/projects/5/views/1).

## Decisions

- **Backend:** NestJS (chosen over the doc's Express) + TypeORM (over Prisma — matches course material) + PostgreSQL
- **Frontend:** Next.js 16 App Router + Tailwind v4 + shadcn/ui on **Base UI** (Vega preset; migrated off Radix). Add components: `npx shadcn@latest add <name> -c frontend`
- **Monorepo:** npm workspaces — `frontend/` (port 3000), `backend/` (port 3001, `/api` prefix), `shared/` (`@foodnote/shared`: Zod schemas = the API contract; compiled to `dist/`, consumed via workspace symlink — transpilePackages/path-mapping deliberately avoided, breaks Nest builds)
- **Process:** `main` locked (PR + 1 review), branches ≤2 days referencing tickets; deploy: Vercel (frontend) + Render/Railway (backend as Docker image)
- **Tooling:** single root Prettier config (single quotes, trailing commas); `npm run format` / `format:check`

## Done (day 1)

- Issues #2 (Initial project setup), #3 (Install dependencies), #4 (Protect main via ruleset)
- `main` bootstrapped (`7acd5fa`); monorepo scaffolded and verified end-to-end: both dev servers, `GET /api/health` validated by the shared Zod schema, Postgres 16 via `docker compose up -d`, backend tests 1/1 — **PR #5** open (closes #2, #3)
- Prettier setup committed (`a6a8531`, local); shadcn initialized and migrated Radix → Base UI (reports in `.migration/`); minimal `AGENTS.md`/`CLAUDE.md`; `PLAN.md` with the week-1 task split

## How to run

```bash
npm install
npm run db:up          # Postgres 16 (Docker)
npm run dev            # shared (watch) + backend :3001 + frontend :3000
```

Docker runs only the database for now; apps run natively (fast HMR, native debugging). Backend Dockerfile arrives with the deployment task.

## Open items

- Board access: `riedel28` needs Write on the project board (owner: Valentyn — project Settings → Manage access), then issues #2–#4 go to Backlog
- Verify the `main` ruleset actually exists (Settings → Rules → Rulesets); creation from CLI was blocked
- PR #5 needs a teammate review to merge; week-1 tasks branch off `main` after that
- Uncommitted work in the tree (shadcn/Base UI, AGENTS.md, PLAN.md, SUMMARY.md, .migration/) and one unpushed local commit (Prettier)

## Next (see PLAN.md)

P2: TypeORM + entities + migration · P3: auth end-to-end · P4: CI + Dockerfile + walking-skeleton deploy · P1: app shell + auth UI. Couplings: 1→2, 2→4-wiring.
