import {
  aiParseResponseSchema,
  authUserSchema,
  dashboardResponseSchema,
  goalResponseSchema,
  listMealsResponseSchema,
  listWeightsResponseSchema,
  mealResponseSchema,
  profileResponseSchema,
  weightEntryResponseSchema,
  type AiParseRequest,
  type AiParseResponse,
  type AuthUser,
  type CreateGoalRequest,
  type CreateMealRequest,
  type UpdateMealRequest,
  type CreateWeightRequest,
  type DashboardResponse,
  type GoalResponse,
  type ListMealsResponse,
  type ListWeightsResponse,
  type MealResponse,
  type ProfileResponse,
  type PutProfileRequest,
  type UpdateAccountRequest,
  type UpdateGoalRequest,
  type UpdateWeightRequest,
  type WeightEntryResponse,
} from '@foodnote/shared';
import { ApiError, apiErrorMessage } from '@/lib/api-error';

// Re-exported so existing importers keep their path; the class itself is shared
// with the server data layer, which throws the same one.
export { ApiError };

/**
 * Client-side calls, on their way out.
 *
 * There is no token here any more. The access token is an httpOnly cookie that
 * this code cannot read, and the relative `/api/*` paths below now land on
 * `app/api/[...path]/route.ts` — the transitional bridge — which reads that
 * cookie and adds the `Authorization` header server-side. Renewal is `proxy.ts`'s
 * job, so the retry-on-401 that used to live here is gone too: a 401 reaching
 * this point means the session is genuinely dead, not merely stale.
 *
 * **This module and the bridge are deleted together, on this branch, before the
 * pull request opens.** Every call below belongs to a route that has not been
 * migrated yet; nothing new should be added.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await apiErrorMessage(res));
  }
  return res;
}

/**
 * What is left of the auth surface: reading and editing the signed-in account.
 * Login, register, logout and refresh are gone — they set or clear the session
 * cookies, which client JS cannot do, so they are Server Actions
 * (`lib/actions/auth.ts`) and `proxy.ts`. The bridge refuses those four paths.
 *
 * `me()` has no callers left either: the server reads the user through
 * `getCurrentUser()`. Only the profile page's account edit still comes through
 * here, until the profile route moves it to an action.
 */
export const auth = {
  async updateMe(data: UpdateAccountRequest): Promise<AuthUser> {
    const res = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return authUserSchema.parse(await res.json());
  },
};

function rangeQuery(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const weights = {
  /** POST /weights appends a new journal entry (the journal is a plain list). */
  async create(data: CreateWeightRequest): Promise<WeightEntryResponse> {
    const res = await apiFetch('/api/weights', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return weightEntryResponseSchema.parse(await res.json());
  },

  /** GET /weights?from&to — inclusive UTC-day bounds; the dashboard builds the
      trend series client-side from this journal (ADR-0005). */
  async list(from?: string, to?: string): Promise<ListWeightsResponse> {
    const res = await apiFetch(`/api/weights${rangeQuery(from, to)}`);
    return listWeightsResponseSchema.parse(await res.json());
  },

  /** PATCH /weights/:id corrects a specific entry (append-only journal, ADR-0004). */
  async update(
    id: string,
    data: UpdateWeightRequest,
  ): Promise<WeightEntryResponse> {
    const res = await apiFetch(`/api/weights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return weightEntryResponseSchema.parse(await res.json());
  },

  /** DELETE /weights/:id — 204. */
  async remove(id: string): Promise<void> {
    await apiFetch(`/api/weights/${id}`, { method: 'DELETE' });
  },
};

export const meals = {
  /** GET /meals?from&to — inclusive UTC-day bounds. Feeds both the "Logged
      today" list and the 7-day calorie chart (ADR-0005). */
  async list(from?: string, to?: string): Promise<ListMealsResponse> {
    const res = await apiFetch(`/api/meals${rangeQuery(from, to)}`);
    return listMealsResponseSchema.parse(await res.json());
  },

  /** POST /meals — totals are the source of truth; the server never sums items. */
  async create(data: CreateMealRequest): Promise<MealResponse> {
    const res = await apiFetch('/api/meals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mealResponseSchema.parse(await res.json());
  },

  /** PATCH /meals/:id — a partial draft. Totals stay the source of truth, so
      the items are only ever sent alongside them, never summed into them. */
  async update(id: string, data: UpdateMealRequest): Promise<MealResponse> {
    const res = await apiFetch(`/api/meals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return mealResponseSchema.parse(await res.json());
  },

  /** DELETE /meals/:id — 204, used by the save toast's Undo action. */
  async remove(id: string): Promise<void> {
    await apiFetch(`/api/meals/${id}`, { method: 'DELETE' });
  },

  /**
   * POST /meals/ai-parse — never writes. Resolves to the discriminated union:
   * a Parsed Meal, or the "not food" verdict, both successful recognitions
   * (ADR-0006). Real failures reject as ApiError: 429 rate limit, 502 terminal
   * model failure. `signal` carries the drawer's cancel/timeout.
   */
  async aiParse(
    data: AiParseRequest,
    signal?: AbortSignal,
  ): Promise<AiParseResponse> {
    const res = await apiFetch('/api/meals/ai-parse', {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
    return aiParseResponseSchema.parse(await res.json());
  },
};

export const dashboard = {
  /** GET /dashboard?date — the thin single-day read model (ADR-0005). 404s
      until onboarding is complete; the (app) OnboardingGuard gates that. */
  async current(date?: string): Promise<DashboardResponse> {
    const query = date ? `?date=${date}` : '';
    const res = await apiFetch(`/api/dashboard${query}`);
    return dashboardResponseSchema.parse(await res.json());
  },
};

export const profile = {
  /** GET /profile — 404 until the profile exists. */
  async current(): Promise<ProfileResponse> {
    const res = await apiFetch('/api/profile');
    return profileResponseSchema.parse(await res.json());
  },

  /** PUT /profile create-or-replaces the profile (the onboarding entry point). */
  async put(data: PutProfileRequest): Promise<ProfileResponse> {
    const res = await apiFetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return profileResponseSchema.parse(await res.json());
  },
};

export const goals = {
  /** POST /goals creates a new active goal (replacing any prior active one). */
  async create(data: CreateGoalRequest): Promise<GoalResponse> {
    const res = await apiFetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return goalResponseSchema.parse(await res.json());
  },

  async current(): Promise<GoalResponse> {
    const res = await apiFetch('/api/goals/current');
    return goalResponseSchema.parse(await res.json());
  },

  /** PATCH /goals/current edits the active goal in place (e.g. change pace). */
  async update(data: UpdateGoalRequest): Promise<GoalResponse> {
    const res = await apiFetch('/api/goals/current', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return goalResponseSchema.parse(await res.json());
  },
};
