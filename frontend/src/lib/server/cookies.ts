import { env } from './env';

/**
 * The two Next-owned session cookies.
 *
 * Next is the BFF: these hold the raw Nest JWTs, but they are set, read and
 * cleared by this app on its own domain — Nest's own `refreshToken` cookie is
 * path-scoped to `/api/auth` and is never seen by a document request here.
 *
 * The names live in one place because three unrelated call sites depend on them
 * agreeing: `proxy.ts` (renewal), the server data layer (reads), and the auth
 * Server Actions (login, logout). A typo in any one of them is a silent logout.
 */
export const ACCESS_COOKIE = 'foodnote_access';
export const REFRESH_COOKIE = 'foodnote_refresh';

/**
 * Mirrors Nest's own refresh TTL (7d). The access cookie deliberately does not
 * carry a `maxAge`: it is a session cookie whose real expiry is the `exp` claim
 * inside the JWT, and pinning a second, independent lifetime on the outside is
 * how the two drift apart.
 */
export const REFRESH_COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  // Lax, not Strict: a Strict cookie is withheld on the first navigation from
  // any external link, so a signed-in user following a link to the app would
  // land on the marketing page as an anonymous visitor.
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
} as const;
