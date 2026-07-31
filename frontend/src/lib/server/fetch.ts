import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { ACCESS_COOKIE } from './cookies';
import { env } from './env';

/**
 * The only door to Nest from the server.
 *
 * Authorization is not a step a caller can forget here, because there is no way
 * to get the data without going through this function: no access cookie, or a
 * 401 from Nest, and the request never returns — it redirects to `/login`. That
 * is deliberately stronger than a gate in a layout, which only runs for the
 * routes that happen to sit under it.
 *
 * Response parsing lives here and nowhere else. Everything above this line
 * receives values that have already been through a `shared/` schema, so no
 * component ever holds an unvalidated API shape.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & {
  /** Treat 404 as an absent resource rather than a failure. */
  nullOn404?: boolean;
};

async function request(
  path: string,
  { nullOn404, ...init }: FetchOptions,
): Promise<Response | null> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;

  // No cookie at all: `proxy.ts` renews an *expired* access token, so reaching
  // here without one means there was no session to renew.
  if (!accessToken) redirect('/login');

  const res = await fetch(`${env.API_URL}/api${path}`, {
    ...init,
    // Every read is per-user and cookie-dependent, so there is nothing here a
    // cache could legitimately share. Explicit rather than inherited: a default
    // that flips would silently serve one user's dashboard to another.
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      // Once every call to Nest originates in a Vercel function, `req.ip`
      // collapses to a handful of egress addresses and the per-IP auth throttle
      // buckets every user together. Forwarding the real client address is what
      // keeps that limit per-user — see `backend/src/common/trust-proxy.ts`.
      ...forwardedFor(await headers()),
      ...init.headers,
    },
  });

  if (res.status === 401) redirect('/login');
  if (res.status === 404 && nullOn404) return null;

  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res));
  }

  return res;
}

/** Reads and writes that must succeed; failures reach `error.tsx` or the action. */
export async function serverFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init: FetchOptions = {},
): Promise<T> {
  const res = await request(path, init);
  // Unreachable: `nullOn404` is not set, so `request` either returns or throws.
  if (!res) throw new ApiError(404, 'Not found');
  return schema.parse(await res.json());
}

/**
 * For endpoints where "not there" is an ordinary answer rather than a fault —
 * `GET /goals/current` 404s for a user who has not finished onboarding, which is
 * a state the app renders, not an error it reports.
 */
export async function serverFetchOrNull<T>(
  path: string,
  schema: z.ZodType<T>,
  init: FetchOptions = {},
): Promise<T | null> {
  const res = await request(path, { ...init, nullOn404: true });
  return res ? schema.parse(await res.json()) : null;
}

/** 204s and other bodiless successes. */
export async function serverSend(
  path: string,
  init: FetchOptions = {},
): Promise<void> {
  await request(path, init);
}

function forwardedFor(incoming: Headers): Record<string, string> {
  const value = incoming.get('x-forwarded-for');
  return value ? { 'x-forwarded-for': value } : {};
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const { message } = body;
    if (Array.isArray(message)) return message.join(', ');
    return message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}
