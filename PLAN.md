# FoodNote — Week 1 Plan (next 2–3 days)

Day 1 (monorepo scaffold, PR #5) is done. Four tasks, one owner each, branching off `main` after PR #5 merges.

## Task 1 — Database layer: TypeORM + entities + first migration

**Owner: Person 2 · ~1.5 days · no dependencies — start immediately**

- Wire `@nestjs/typeorm` + `pg`, config from `DATABASE_URL` (see `.env.example`)
- Entities for all six models: User, UserProfile, Goal, WeightEntry, MealEntry, MealItem
- Initial migration committed; `migration:generate` / `migration:run` npm scripts
- ⚠️ WeightEntry one-per-day = composite unique index on `userId` + a **date-typed** column, not a timestamp

**Done when:** backend boots connected to the compose Postgres; migration runs clean on a fresh DB.

## Task 2 — Authentication end-to-end

**Owner: Person 3 · ~2.5 days · needs User entity from Task 1 (~day 2), but starts now**

- Day 1: request/response Zod schemas in `shared/`, auth module skeleton, tests against a stubbed repository
- Register / login / logout; bcrypt hashing; short-lived JWT access token + refresh token in httpOnly cookie
- `JwtAuthGuard` for protected routes

**Done when:** register → login → guarded endpoint → logout works via curl against the running stack, covered by an e2e test.

## Task 3 — CI + walking-skeleton deployment

**Owner: Person 4 · ~2 days · no dependencies**

- GitHub Actions on every PR: install, `format:check`, lint, typecheck, test, build (root scripts already exist)
- `backend/Dockerfile`; deploy backend as a container (Render/Railway) + managed Postgres; frontend to Vercel
- Document required env vars

**Done when:** CI green on PR #5; deployed frontend shows live "Backend: ok" against the deployed API.

## Task 4 — Frontend foundation + auth UI

**Owner: Person 1 · ~2.5 days · UI now, auth wiring when Task 2 lands**

- App shell with shadcn/ui (Base UI — add components via `npx shadcn@latest add <name> -c frontend`): layout, nav
- Login/register pages with forms validated by the same `shared/` Zod schemas the backend enforces
- Lightweight wireframes for the 4 core screens; auth-state handling stubbed until Task 2's endpoints are live

**Done when:** forms validate client-side; after auth lands, sign-up → redirect to dashboard placeholder works in the browser.

## Sequencing

- Merge **PR #5** first (needs one teammate review once the main ruleset is active)
- Couplings: Task 1 → Task 2 (User entity), Task 2 → Task 4 (final auth wiring); both staged so nobody idles
