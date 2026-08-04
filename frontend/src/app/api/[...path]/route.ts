import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/server/cookies';
import { forwardedFor, nestUrl } from '@/lib/server/nest';

/**
 * **Scaffolding that never reaches `main`. This file is deleted on this branch,
 * before the pull request opens.** Nothing may be written against it.
 *
 * Why it exists at all: deleting the `/api/*` rewrite from `next.config.ts` is
 * what closes the browser's direct line to Nest, and `api-client.ts` — which
 * every unmigrated route still calls — fetches through exactly that rewrite. So
 * from the moment the rewrite goes until the last route is migrated, `/profile`
 * and `/onboarding` would be broken, and with them the app and the smoke net. On
 * a branch that lives for one commit that would be tolerable; on one that lives
 * for the whole migration it means working blind.
 *
 * So it stands in: the relative path still resolves, and this reads the httpOnly
 * access cookie that client JS cannot and adds the `Authorization` header Nest
 * wants. Callers are untouched, and each route migrates off it in its own commit.
 *
 * It is knowingly against the spirit of the rule that client code reaches the
 * server only through Server Actions and Route Handlers — a catch-all proxy is a
 * Route Handler by the letter and not by the intent. What licenses it is that it
 * is temporary *and* that nothing outside this branch ever sees it.
 */

/**
 * The four session routes are refused, not proxied.
 *
 * Each of them either sets or clears the two httpOnly cookies, and this handler
 * answers client JS, which cannot hold them. Special-casing them here would write
 * the most security-sensitive code in the app twice, once in a file scheduled for
 * deletion: they are Server Actions instead (`lib/actions/auth.ts`), and renewal
 * belongs to `proxy.ts`.
 *
 * Note this is narrower than "all of `/api/auth/*`". `GET` and `PATCH
 * /api/auth/me` sit under the same prefix but establish nothing — they are
 * ordinary authenticated calls, and the reason above does not reach them. Read
 * the reason, not the prefix: refusing them would strand the profile page's
 * account edit for two more PRs for no security gain.
 */
const SESSION_ROUTES = new Set(['login', 'register', 'refresh', 'logout']);

function refusesSession(segments: string[]): boolean {
  return segments[0] === 'auth' && SESSION_ROUTES.has(segments[1] ?? '');
}

async function forward(
  request: NextRequest,
  segments: string[],
): Promise<Response> {
  if (refusesSession(segments)) {
    return Response.json(
      {
        message: 'Session routes are not proxied; use the auth Server Actions.',
      },
      { status: 404 },
    );
  }

  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    // No redirect: the caller is a `fetch()`, and a page of login HTML is not an
    // answer it can use. `proxy.ts` has already tried to renew by this point, so
    // arriving here without a token means there was no session to renew.
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = `${nestUrl(`/${segments.map(encodeURIComponent).join('/')}`)}${request.nextUrl.search}`;

  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';

  const upstream = await fetch(url, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...forwardedFor(request.headers),
    },
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  });

  // 204 and friends must not carry one, and `Response` throws if given a body
  // with a status that forbids it.
  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

type Context = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, { params }: Context) {
  return forward(request, (await params).path);
}

// The method is already on the request; every verb the app uses is the same
// handler, so it is written once and exported five times.
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
};
