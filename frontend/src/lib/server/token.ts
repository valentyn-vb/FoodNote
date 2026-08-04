import { z } from 'zod';

/**
 * Split out of `session.ts` because `proxy.ts` needs these two and must not
 * import `next/headers` or `next/navigation`: it runs before a route is rendered,
 * where `cookies()` and `redirect()` do not exist.
 */

/**
 * What `backend/src/auth/auth.service.ts` signs, minus the claims nothing here
 * reads. `email` is loose on purpose — validating it as an address would add a
 * way for a *valid* token to be read as "no session".
 */
const sessionClaimsSchema = z.object({
  sub: z.string(),
  email: z.string(),
  exp: z.number(),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;

/**
 * No signature check — a forged token is indistinguishable from a real one here,
 * so **never gate data on this**. Nest rejects a forgery on the very next
 * request, which is the check that counts; this one saves a page that reads
 * nothing a round trip just to choose between "sign in" and "open the app".
 */
export function decodeSession(token: string): SessionClaims | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    return sessionClaimsSchema.safeParse(claims).data ?? null;
  } catch {
    return null;
  }
}

export function isExpired(claims: SessionClaims): boolean {
  return claims.exp * 1000 <= Date.now();
}
