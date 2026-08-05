import { env } from './env';

/**
 * The two things every server-to-Nest call has in common, in one place.
 *
 * Pure — no `next/headers` — so `proxy.ts` can import it alongside
 * `lib/server/fetch.ts`, the auth actions and the ai-parse Route Handler. Each of
 * those keeps its own auth and error policy; only the transport is shared.
 */

/** Nest serves everything under `/api`; the prefix is joined here and nowhere else. */
export function nestUrl(path: string): string {
  return `${env.API_URL}/api${path}`;
}

/**
 * Every call to Nest now leaves from a Vercel function, so `req.ip` collapses to
 * a handful of egress addresses and the per-IP auth throttle buckets all users
 * together — five strangers' failed logins lock out the sixth. Forwarding the
 * real client address is what keeps that limit per-user; see
 * `backend/src/common/trust-proxy.ts`.
 */
export function forwardedFor(incoming: Headers): Record<string, string> {
  const value = incoming.get('x-forwarded-for');
  return value ? { 'x-forwarded-for': value } : {};
}
