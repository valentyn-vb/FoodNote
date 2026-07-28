/**
 * Rate-limit policy in one place, so the numbers are reviewable in a diff
 * instead of spread across decorators. The limits are not configurable per
 * environment on purpose: they are policy, and prod behaviour should be
 * readable from the code. What does differ per environment is the proxy depth
 * (TRUST_PROXY_HOPS, see common/trust-proxy.ts).
 *
 * Counters live in the throttler's in-memory store, so they are per process and
 * reset on deploy — see the note at ThrottlerModule.forRoot in app.module.ts.
 */

export const MINUTE_MS = 60_000;

/** API-wide floor, tracked per client IP. Every route inherits this. */
export const GLOBAL_THROTTLE = { ttl: MINUTE_MS, limit: 100 };

/** Register/login, per IP — the anti credential-stuffing limit (#37). */
export const AUTH_THROTTLE = { ttl: MINUTE_MS, limit: 5 };

/**
 * Replaces the library default ("ThrottlerException: Too Many Requests"), which
 * reaches users verbatim — the frontend's ApiError surfaces `message` straight
 * into form errors.
 */
export const TOO_MANY_REQUESTS_MESSAGE =
  'Too many attempts. Please try again in a minute.';
