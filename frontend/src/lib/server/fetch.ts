// The access cookie and the Authorization header it becomes are built here, so a
// client import is a token in a browser bundle. `server-only` makes that a build
// error instead of a review item — the class of mistake it catches is silent
// otherwise: a `'use client'` module's exports reach a Server Component as client
// references, with no type error and nothing in the console.
import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { z } from 'zod';
import { ApiError, apiErrorMessage } from '@/lib/api-error';
import { ACCESS_COOKIE } from './cookies';
import { forwardedFor, nestUrl } from './nest';

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

async function request(path: string, init: RequestInit): Promise<Response> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;

  // No cookie at all: `proxy.ts` renews an *expired* access token, so reaching
  // here without one means there was no session to renew.
  if (!accessToken) redirect('/login');

  const res = await fetch(nestUrl(path), {
    ...init,
    // Every read is per-user and cookie-dependent, so there is nothing here a
    // cache could legitimately share. Explicit rather than inherited: a default
    // that flips would silently serve one user's dashboard to another.
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...forwardedFor(await headers()),
      ...init.headers,
    },
  });

  // A redirect *is* a thrown error, so an action that wraps this call in a
  // try/catch swallows it and reports a save failure instead — leaving the user
  // on a form that can never succeed. Every action therefore opens its catch with
  // `unstable_rethrow(err)`; that repetition is this line's cost.
  if (res.status === 401) redirect('/login');

  if (!res.ok) {
    throw new ApiError(res.status, await apiErrorMessage(res));
  }

  return res;
}

/** Reads and writes that must succeed; failures reach `error.tsx` or the action. */
export async function serverFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T> {
  const res = await request(path, init);
  return schema.parse(await res.json());
}

/**
 * For endpoints where "not there" is an ordinary answer rather than a fault —
 * `GET /goals/current` 404s for a user who has not finished onboarding, which is
 * a state the app renders, not an error it reports.
 *
 * The 404 is caught here rather than flagged down into `request`, so the
 * primitive keeps one return type and the policy sits in the one function whose
 * name declares it.
 */
export async function serverFetchOrNull<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
): Promise<T | null> {
  try {
    return await serverFetch(path, schema, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    // Everything else goes back up untouched — including the `NEXT_REDIRECT`
    // that `redirect('/login')` throws, which must not be swallowed here.
    throw err;
  }
}

/** 204s and other bodiless successes. */
export async function serverSend(
  path: string,
  init: RequestInit = {},
): Promise<void> {
  await request(path, init);
}
