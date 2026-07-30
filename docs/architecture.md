# Architecture (#42)

Four diagrams, each verified against the running code (paths and behavior cited
inline), not inferred from naming. Each has a Mermaid block (renders natively
on GitHub — in this file, in issues, in PR descriptions before anything is
pushed) and a PNG under `docs/architecture/` (renders as an image in the repo
and in a PR body once the branch is pushed).

## System context

![System context](architecture/01-system-context.png)

```mermaid
flowchart LR
    Client[Browser] --> Next["Next.js :3000<br/>rewrites /api/* → API_URL"]
    Next --> Nest["Nest API :3001<br/>/api prefix"]
    Nest --> DB[("PostgreSQL<br/>TypeORM")]
    Nest -.->|"meals/ai-parse only"| OpenAI["OpenAI<br/>external, server-side key"]
```

Auth: access token in the JSON response body, refresh token in an httpOnly
cookie. Checked at the Nest API boundary (`JwtAuthGuard`), not by Next.js.

## Module map

![Module map](architecture/02-module-map.png)

```mermaid
flowchart BT
    Dashboard["Dashboard<br/>writes nothing"] -->|service call| Profile
    Dashboard -->|service call| Goals
    Dashboard -.->|"direct repo read — bypasses MealsService"| MealEntry[("MealEntry")]
    Auth
    User
    Weights
    Meals -.->|external| OpenAI[OpenAI]
```

7 modules wired in `app.module.ts`. `DashboardService`'s constructor injects
`ProfileService`, `GoalsService`, and `MealEntry`'s repository directly — not
`MealsService`. That's a real, non-obvious coupling: Dashboard shares a table
with Meals without going through its service layer. Weight-trend and 7-day
calorie series are **not** served here; the client builds them from
`GET /weights` and `GET /meals` (ADR-0005). Auth, User and Weights aren't read
by Dashboard at all.

## AI meal-parse lifecycle

![AI meal-parse lifecycle](architecture/03-ai-meal-parse-lifecycle.png)

```mermaid
flowchart TD
    Client["Client — Bearer access token"] --> Guard[JwtAuthGuard]
    Guard --> Controller["MealsController → MealsService"]
    Controller --> OpenAI["OpenAI — one round trip"]
    OpenAI -->|parser.ts| Outcome{outcome}
    Outcome -->|meal| Saved["saved as a Meal Entry"]
    Outcome -->|notFood| NotFood["not an error — ADR-0006"]
    Outcome -->|failed| Failed[failureKind]
    Failed --> refusal
    Failed --> truncated
    Failed --> contentFilter
    Failed --> transport
    Failed --> invalidOutput
```

`outcome: 'meal' | 'notFood' | 'failed'` — from `backend/src/meals/openai/parser.ts`.
The five `failureKind` values are copied from an observed test-log line for
each, not guessed.

## Auth flow

![Auth flow](architecture/04-auth-flow.png)

```mermaid
flowchart TD
    Login["POST /auth/register or /auth/login"] --> Access["access token — JSON body"]
    Login --> Refresh["refresh token — httpOnly cookie, path=/api/auth"]
    Access --> Me["GET/PATCH /auth/me — JwtAuthGuard"]
    Me -->|on expiry| RefreshCall["POST /auth/refresh — reads the cookie, 401 if absent"]
    RefreshCall --> Logout["POST /auth/logout"]
```

Verified in `auth.controller.ts`. **Not verified:** cookie `Secure`/`SameSite`
flags, and token TTLs beyond the `.env.example` defaults (access 15m, refresh 7d).

---

Source file (editable): [Paper — Foodnote Design System](https://app.paper.design/file/01KXDP0BGYQ1SYCCDP0E5XP2ED/1-0),
artboards `ARCH01`–`ARCH04`.
