import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import {
  authUserSchema,
  goalResponseSchema,
  type AuthUser,
  type GoalResponse,
} from '@foodnote/shared';
import { ACCESS_COOKIE } from './cookies';
import { serverFetch, serverFetchOrNull } from './fetch';

/**
 * Session helpers. Two different jobs live here, and confusing them is the
 * mistake this file is arranged to prevent:
 *
 * - `verifySession` is a *local* read of the token. It never talks to Nest and
 *   it never verifies a signature — the frontend holds no JWT secret. It is a
 *   cheap "is there plausibly a session" for entry points that fetch nothing.
 * - `getCurrentUser` / `getCurrentGoal` go through `serverFetch`, so Nest is the
 *   authority. Anything that renders real data must use these.
 */

type SessionClaims = {
  sub: string;
  email: string;
  exp: number;
};

/**
 * Reads the `exp` claim without validating the signature — a forged token is
 * indistinguishable from a real one here. **Never gate data on this.** Nest
 * rejects a forged token on the very next request, which is the check that
 * counts; this one exists so a page that reads nothing does not have to make a
 * network round trip just to decide between "sign in" and "open the app".
 */
export function decodeSession(token: string): SessionClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<SessionClaims>;
    if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number') {
      return null;
    }
    return claims as SessionClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: SessionClaims): boolean {
  return claims.exp * 1000 <= Date.now();
}

/** Optimistic, non-authoritative — see `decodeSession`. */
export async function verifySession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const claims = decodeSession(token);
  return claims && !isExpired(claims) ? claims : null;
}

/**
 * Memoized per render pass, so the several components that want the signed-in
 * user across one page cost one request between them. `cache` is per-request:
 * nothing leaks between users.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser> => {
  return serverFetch('/auth/me', authUserSchema);
});

/**
 * The active Goal, or `null` for a user who has not finished onboarding —
 * `GET /goals/current` 404s in that case, which is a state, not a failure.
 *
 * Memoized, which is what makes the onboarding checks below free: every `(app)`
 * page already reads the goal to render the target overlay, so `requireOnboarded`
 * rides along on a request that was happening anyway.
 */
export const getCurrentGoal = cache(async (): Promise<GoalResponse | null> => {
  return serverFetchOrNull('/goals/current', goalResponseSchema);
});

/**
 * For `(app)` routes. Returns the goal, so a caller that needs it does not fetch
 * it twice — though `getCurrentGoal` being memoized means it would not cost a
 * second request either way.
 */
export async function requireOnboarded(): Promise<GoalResponse> {
  const goal = await getCurrentGoal();
  if (!goal) redirect('/onboarding');
  return goal;
}

/**
 * For the onboarding route. The mirror image of `requireOnboarded`, over the
 * same memoized read — which is what makes a redirect loop arithmetically
 * impossible rather than merely unlikely: within one render the two conditions
 * are negations of a single value, so they cannot both hold.
 */
export async function requireNotOnboarded(): Promise<void> {
  if (await getCurrentGoal()) redirect('/dashboard');
}
