import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  NEST_REFRESH_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from '@/lib/server/cookies';
import { forwardedFor, nestUrl } from '@/lib/server/nest';
import { NEXT_PARAM } from '@/lib/server/next-param';
import { decodeSession, isExpired } from '@/lib/server/token';

/**
 * Two jobs, and only one of them is security.
 *
 * **Renewal** is the job nothing else can do. A Server Component may read
 * cookies but never write them, so a 15-minute access token that expires between
 * two page loads cannot be renewed during a render. Proxy runs before the render
 * and can do both: it hands the new token to the browser *and* to the render
 * already in flight.
 *
 * **The redirects** are an optimisation, not the gate. The real check is that
 * `serverFetch` is the only door to data and redirects to `/login` without a
 * cookie or on a 401 — that cannot be forgotten, because the data cannot be had
 * without it. Proxy redirects because it has already read both cookies, so the
 * decision is free, and it saves a signed-out visitor a full RSC render plus a
 * round trip to Render just to be told to log in. It also covers the one case
 * the data layer structurally cannot: `(auth)` pages read nothing, so no
 * `serverFetch` ever runs there to bounce a user who is already signed in.
 */

/** Where an already-signed-in visitor has no business being. */
const AUTH_PATHS = new Set(['/login', '/register']);

/** Reachable without a session. Everything else needs one, including routes that do not exist yet. */
const PUBLIC_PATHS = new Set(['/', ...AUTH_PATHS]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The transitional bridge (`app/api/[...path]/route.ts`) benefits from
  // renewal like any other request, but it is called by client JS: answering it
  // with a redirect to `/login` would hand a `fetch()` a page of HTML. It gets
  // the new token and nothing else; a dead session there surfaces as the 401 the
  // bridge already returns.
  const isBridge = pathname.startsWith('/api/');

  // Written once because it is asked three times below, twice as its own
  // negation — a public path gained later has to reach all three.
  const mayRedirect = !isBridge && !PUBLIC_PATHS.has(pathname);

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const claims = accessToken ? decodeSession(accessToken) : null;

  // Stays null on the common path — a live token costs no network and no work —
  // and it is what every `return` below has to remember to carry.
  let renewed: string | null = null;

  if (claims === null || isExpired(claims)) {
    if (!refreshToken) {
      if (!mayRedirect) return NextResponse.next();
      return NextResponse.redirect(loginUrl(request));
    }

    renewed = await renewAccessToken(refreshToken, request);

    if (!renewed) {
      // Refresh was refused: the seven days are up, or the token was revoked.
      // This is the one place a dead session is discovered, rather than every
      // call site discovering it separately.
      return signedOut(request, { redirect: mayRedirect });
    }
  }

  // A live session from here down, whether it arrived that way or was just
  // renewed. The renewed token rides on whichever response we return, a redirect
  // included — dropping it would send the next request straight back for another
  // refresh.
  if (!isBridge && AUTH_PATHS.has(pathname)) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    if (renewed) {
      response.cookies.set(ACCESS_COOKIE, renewed, SESSION_COOKIE_OPTIONS);
    }
    return response;
  }

  return renewed ? handOn(request, renewed) : NextResponse.next();
}

/**
 * Exchanges the refresh token for a fresh access token.
 *
 * Safe to run on a prefetch, and it will: `auth.service.refresh()` does not
 * rotate the refresh token, so the same one stays valid for its full seven days
 * and a duplicate call is not destructive.
 */
async function renewAccessToken(
  refreshToken: string,
  request: NextRequest,
): Promise<string | null> {
  try {
    const res = await fetch(nestUrl('/auth/refresh'), {
      method: 'POST',
      headers: {
        // Nest takes the refresh token from a cookie, not from a body
        // (`auth.controller.ts`), and its own cookie is path-scoped to
        // `/api/auth` — which is exactly where this request goes.
        Cookie: `${NEST_REFRESH_COOKIE}=${refreshToken}`,
        ...forwardedFor(request.headers),
      },
    });
    if (!res.ok) return null;
    // Checked by hand rather than with `refreshResponseSchema`: `shared/` is a
    // CommonJS barrel, so importing one schema pulls every schema in the
    // contract into the bundle this proxy evaluates on *every* navigation and
    // prefetch. A string is all that is needed, and Nest checks the token
    // itself on the next request anyway.
    const { accessToken } = (await res.json()) as { accessToken?: unknown };
    return typeof accessToken === 'string' ? accessToken : null;
  } catch {
    // Render asleep, DNS, a dropped connection: not a dead session, so do not
    // clear the cookies over it. The caller treats this as "not renewed" and the
    // user meets the failure again on the next request, by which time Render may
    // be awake.
    return null;
  }
}

/**
 * Gives the renewed token to both readers in one pass: the browser, via
 * `Set-Cookie`, and the render about to happen, via the request headers it will
 * see. Without the second half the very render that triggered the renewal would
 * still read the expired token out of `cookies()` and redirect to `/login`.
 */
function handOn(request: NextRequest, accessToken: string) {
  request.cookies.set(ACCESS_COOKIE, accessToken);

  const headers = new Headers(request.headers);
  headers.set('cookie', request.cookies.toString());

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(ACCESS_COOKIE, accessToken, SESSION_COOKIE_OPTIONS);
  return response;
}

function signedOut(request: NextRequest, { redirect }: { redirect: boolean }) {
  const response = redirect
    ? NextResponse.redirect(loginUrl(request))
    : NextResponse.next();
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}

function loginUrl(request: NextRequest) {
  const url = new URL('/login', request.url);
  // The whole destination, search string included, so a bookmarked
  // `/meals?day=2026-08-01` survives the round trip. Only proxy sets this
  // parameter; `/login` links in markup do not.
  url.searchParams.set(
    NEXT_PARAM,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return url;
}

export const config = {
  // Without a matcher this runs on every static asset too, and an auth redirect
  // would then apply to the CSS. Renewal must stay cheap because it is on the
  // path of every navigation and every prefetch.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)',
  ],
};
