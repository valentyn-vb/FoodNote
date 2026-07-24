import {
  authResponseSchema,
  authUserSchema,
  dashboardResponseSchema,
  goalResponseSchema,
  listMealsResponseSchema,
  listWeightsResponseSchema,
  mealResponseSchema,
  profileResponseSchema,
  refreshResponseSchema,
  weightEntryResponseSchema,
  type AuthResponse,
  type AuthUser,
  type CreateGoalRequest,
  type CreateMealRequest,
  type CreateWeightRequest,
  type DashboardResponse,
  type GoalResponse,
  type ListMealsResponse,
  type ListWeightsResponse,
  type LoginRequest,
  type MealResponse,
  type ProfileResponse,
  type PutProfileRequest,
  type RegisterRequest,
  type UpdateGoalRequest,
  type WeightEntryResponse,
} from '@foodnote/shared';

/**
 * The access token lives only in memory (never in storage) and is re-obtained
 * via the refresh cookie after a page reload. All requests go through the
 * Next.js proxy, so URLs are relative and cookies are first-party.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  const { accessToken: token } = refreshResponseSchema.parse(await res.json());
  accessToken = token;
  return true;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let res = await rawFetch(path, init);
  if (res.status === 401 && (await tryRefresh())) {
    res = await rawFetch(path, init);
  }
  if (!res.ok) {
    throw new ApiError(res.status, await safeErrorMessage(res));
  }
  return res;
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function handleAuthResponse(res: Response): Promise<AuthResponse> {
  const parsed = authResponseSchema.parse(await res.json());
  accessToken = parsed.accessToken;
  return parsed;
}

export const auth = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return handleAuthResponse(
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    );
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    return handleAuthResponse(
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    );
  },

  async logout(): Promise<void> {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    accessToken = null;
  },

  async me(): Promise<AuthUser> {
    const res = await apiFetch('/api/auth/me');
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

  /** DELETE /meals/:id — 204, used by the save toast's Undo action. */
  async remove(id: string): Promise<void> {
    await apiFetch(`/api/meals/${id}`, { method: 'DELETE' });
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
