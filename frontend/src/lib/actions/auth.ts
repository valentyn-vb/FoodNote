'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  authResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
  type LoginRequest,
  type RegisterRequest,
} from '@foodnote/shared';
import {
  ACCESS_COOKIE,
  NEST_REFRESH_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_S,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/server/cookies';
import { forwardedFor, nestUrl } from '@/lib/server/nest';
import { safeDestination } from '@/lib/server/next-param';
import {
  fail,
  failForm,
  fieldErrorsOf,
  type ActionFailure,
  type ActionResult,
} from './result';

/**
 * Where the session is established. Next is the BFF: these actions are the only
 * code that ever holds a Nest token in the clear, and the browser never does.
 *
 * The trick they exist for: Nest's own refresh cookie is path-scoped to
 * `/api/auth`, so it would never be sent on a document request to `/dashboard`.
 * Read server-side off the `Set-Cookie` header, path never applies — so the token
 * can be re-issued as a cookie of ours, on our domain, at `path=/`.
 *
 * Nothing here throws for an expected failure: a thrown message is replaced with
 * a generic string in a production build, which would turn "Email already
 * registered" into advice for nobody.
 */

export async function login(
  input: LoginRequest,
  destination?: string,
): Promise<ActionResult> {
  // The client already validated this. That proves nothing: a Server Action is a
  // public POST endpoint, so the schema is re-checked here as a trust boundary.
  const parsed = loginRequestSchema.safeParse(input);
  if (!parsed.success)
    return fail('Check the form', fieldErrorsOf(parsed.error));

  const res = await postToNest('/auth/login', parsed.data);

  if (res.status === 401) {
    // Nest does not say which of the two was wrong, and neither do we: naming
    // one would tell an attacker which half they got right.
    return failForm('Invalid email or password.');
  }

  const failure = commonFailure(res) ?? (await establishSession(res));
  if (failure) return failure;

  redirect(safeDestination(destination));
}

export async function register(input: RegisterRequest): Promise<ActionResult> {
  const parsed = registerRequestSchema.safeParse(input);
  if (!parsed.success)
    return fail('Check the form', fieldErrorsOf(parsed.error));

  const res = await postToNest('/auth/register', parsed.data);

  if (res.status === 409) {
    // The one failure that does belong to a field, so it is drawn under it.
    return fail('Email already registered', {
      email: 'That email is already registered.',
    });
  }

  const failure = commonFailure(res) ?? (await establishSession(res));
  if (failure) return failure;

  // A new account has no Plan yet, and `/onboarding` is where it gets one.
  // `requireNotOnboarded()` would bounce them off `/dashboard` anyway; sending
  // them straight there saves the round trip that discovers it.
  redirect('/onboarding');
}

/**
 * Drops both cookies and lands on the landing page.
 *
 * Nest's own logout endpoint is not called: it clears a cookie the browser no
 * longer holds, and the access token it was paired with dies with the cookie we
 * delete here. Its 15-minute window is the same one a page reload already lives
 * with, and calling it would add a Render round trip — on a cold instance, up to
 * twenty seconds — to the one action a user expects to be instant.
 */
export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
  redirect('/');
}

async function postToNest(path: string, body: unknown): Promise<Response> {
  return fetch(nestUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // `AUTH_THROTTLE` is 5/min per IP on both of these routes, so the real
      // client address matters here more than anywhere else.
      ...forwardedFor(await headers()),
    },
    body: JSON.stringify(body),
  });
}

/** The generic apology, in one place: four call sites used to spell it out. */
function tryAgainLater(): ActionFailure {
  return failForm('Something went wrong. Please try again.');
}

/**
 * The tail both actions share — everything after each has handled the one status
 * that is its own (401 for login, 409 for register). Returns `null` when the
 * response is a success, so the caller carries on to the redirect.
 */
function commonFailure(res: Response): ActionFailure | null {
  if (res.status === 429) {
    return failForm('Too many attempts. Wait a minute and try again.');
  }
  if (!res.ok) return tryAgainLater();
  return null;
}

/**
 * Turns Nest's answer into our two cookies. Returns a failure rather than
 * throwing, so a malformed response looks like any other rejected submit.
 */
async function establishSession(res: Response): Promise<ActionFailure | null> {
  const parsed = authResponseSchema.safeParse(await res.json());
  if (!parsed.success) return tryAgainLater();

  const refreshToken = nestRefreshToken(res.headers);
  if (!refreshToken) {
    // Without it the session lasts fifteen minutes and then logs the user out
    // mid-task, which is worse than refusing the login outright.
    return tryAgainLater();
  }

  const store = await cookies();
  store.set(ACCESS_COOKIE, parsed.data.accessToken, SESSION_COOKIE_OPTIONS);
  store.set(REFRESH_COOKIE, refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE_S,
  });

  return null;
}

/**
 * Lifts Nest's refresh token off its `Set-Cookie` header.
 *
 * `getSetCookie()` and not `get('set-cookie')`: a response may carry several
 * `Set-Cookie` headers, and `get` folds them into one comma-joined string that
 * cannot be split again safely — cookie attributes contain commas too, in
 * `Expires`.
 */
function nestRefreshToken(responseHeaders: Headers): string | null {
  for (const setCookie of responseHeaders.getSetCookie()) {
    const [pair] = setCookie.split(';');
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    if (pair.slice(0, separator).trim() === NEST_REFRESH_COOKIE) {
      return pair.slice(separator + 1);
    }
  }
  return null;
}
