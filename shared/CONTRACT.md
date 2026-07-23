# FoodNote API Contract

Frozen end of week 1 (MVP plan §6). Every request/response shape lives in
`shared/src` as a Zod schema — both apps import from `@foodnote/shared`,
nothing is duplicated. All routes are under `/api`; everything except
`/auth/*` and `/health` requires a Bearer access token.

Conventions: fields carry units in their names (`weightKg`, `proteinGrams`);
calories are kcal. `recordedAt` is an ISO UTC datetime; daily boundaries
(dashboard totals) use its **UTC calendar day**. Errors use
the NestJS default envelope (`errorResponseSchema`); clients branch on HTTP
status. Domain vocabulary: see `/CONTEXT.md`.

## Routes

| Route                  | Request                          | Response                    | Statuses            |
| ---------------------- | -------------------------------- | --------------------------- | ------------------- |
| `POST /auth/register`  | `registerRequestSchema`          | `authResponseSchema`        | 201, 409            |
| `POST /auth/login`     | `loginRequestSchema`             | `authResponseSchema`        | 200, 401            |
| `POST /auth/refresh`   | — (cookie)                       | `refreshResponseSchema`     | 200, 401            |
| `POST /auth/logout`    | —                                | —                           | 204                 |
| `GET /auth/me`         | —                                | `authUserSchema`            | 200, 401            |
| `GET /profile`         | —                                | `profileResponseSchema`     | 200, 404¹           |
| `PUT /profile`         | `putProfileRequestSchema`        | `profileResponseSchema`     | 200²                |
| `PATCH /profile`       | `patchProfileRequestSchema`      | `profileResponseSchema`     | 200, 404¹           |
| `POST /goals`          | `createGoalRequestSchema`        | `goalResponseSchema`        | 201³                |
| `GET /goals/current`   | —                                | `goalResponseSchema`        | 200, 404⁴           |
| `PATCH /goals/current` | `updateGoalRequestSchema`        | `goalResponseSchema`        | 200, 404⁴           |
| `POST /weights`        | `createWeightRequestSchema`      | `weightEntryResponseSchema` | 201                 |
| `GET /weights`         | `listWeightsQuerySchema` (query) | `listWeightsResponseSchema` | 200                 |
| `PATCH /weights/:id`   | `updateWeightRequestSchema`      | `weightEntryResponseSchema` | 200, 404            |
| `DELETE /weights/:id`  | —                                | —                           | 204, 404            |
| `POST /meals`          | `createMealRequestSchema`        | `mealResponseSchema`        | 201                 |
| `GET /meals`           | `listMealsQuerySchema` (query)   | `listMealsResponseSchema`   | 200                 |
| `PATCH /meals/:id`     | `updateMealRequestSchema`        | `mealResponseSchema`        | 200, 404            |
| `DELETE /meals/:id`    | —                                | —                           | 204, 404            |
| `POST /meals/ai-parse` | `aiParseRequestSchema`           | `aiParseResponseSchema`     | 200⁶, 400, 429, 502 |
| `GET /dashboard`       | `dashboardQuerySchema` (query)   | `dashboardResponseSchema`   | 200, 404⁷           |
| `GET /health`          | —                                | `healthResponseSchema`      | 200                 |

¹ 404 until the profile exists (onboarding not started).
² PUT creates-or-replaces with a full payload — the onboarding entry point;
replay-safe.
³ POST always creates a new **active** goal; a previous active goal becomes
`replaced`. No 409.
⁴ 404 when no active goal exists — the "onboarding not complete" signal.
⁵ POST always creates a new entry (201); the weight journal is a plain list
with no per-day uniqueness.
⁶ "Not food" is **not** an error: 200 with `{ parsed: false, reason }`
(discriminated union on `parsed`). 400 = bad description, 429 = per-user
rate limit, 502 = OpenAI failure / invalid model output.
⁷ 404 until onboarding is complete (no profile or no active goal).

## Semantics worth restating

- **Weight has one source of truth**: the weight journal. `currentWeightKg`
  on `/profile` and `/dashboard` is derived from the latest entry;
  `PUT/PATCH /profile` do not accept weight. Onboarding logs the first entry
  via `POST /weights`.
- **`maintenanceCalories` / `calorieTarget` are computed on every read**
  (Mifflin-St Jeor × activity factor − pace deficit, clamped to the
  1200 F / 1500 M floor); they are read-only and null until the first weight
  entry / active goal exist.
- **Pace is one of three presets** (`0.25 | 0.5 | 0.75` kg/week) — a frozen
  `z.literal` set, not a free number. `PACE_OPTIONS` is derived from
  `paceSchema` so the values are defined once.
- **Meal totals are authoritative**; `items` are an optional breakdown the
  server never sums or reconciles. `PATCH /meals/:id` with `items` replaces
  the whole list.
- **Onboarding = three calls**: `PUT /profile` →
  `POST /weights` → `POST /goals`. No transaction needed. `PUT /profile` and
  `POST /goals` are replay-safe; retrying `POST /weights` just appends another
  entry (latest `recordedAt` wins for `currentWeightKg`).
- The AI parse item/total field names match the meal schema exactly, so a
  confirmed preview posts to `POST /meals` (`source: 'ai'`) without mapping.

## Deviations from the MVP plan doc

- **`POST /auth/refresh`, `GET /auth/me`** — added for the stateless
  refresh-token flow (documented in PR #24).
- **`PUT /profile`** — added; the doc lists no way to create a profile.
- **`GET /weights`, query params on `GET /meals`** — added so the charts and
  the edit/delete UI have a list source; the dashboard stays thin.
- **AI parse response** — the doc's flat example became a discriminated
  union (`parsed`), its `estimatedQuantity` was renamed to
  `quantityDescription` to match `MealItem`, and macro fields carry unit
  suffixes (`proteinGrams`, not `protein`).
- **`UserProfile.currentWeightKg` / `maintenanceCalories` / `calorieTarget`
  are not stored fields** — derived on read (see above).
- **UTC day boundaries** — `recordedAt` is kept as a datetime (per the doc),
  and days are cut at UTC with no timezone parameter. Known limitation: a
  late-evening local meal can land on the next UTC day. Accepted for the MVP.
- Tech-stack deviations (NestJS/TypeORM/Next.js instead of
  Express/Prisma/Vite) are deliberate and team-approved.
