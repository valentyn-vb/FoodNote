import {
  authResponseSchema,
  authUserSchema,
  refreshResponseSchema,
  type AuthResponse,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
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
