import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { aiParseRequestSchema } from '@foodnote/shared';
import { ACCESS_COOKIE } from '@/lib/server/cookies';
import { forwardedFor, nestUrl } from '@/lib/server/nest';

/**
 * The one endpoint the browser still calls directly, and the only Route Handler
 * in the app.
 *
 * Everything else writes through a Server Action. A parse cannot: the drawer
 * aborts it — on a user cancel, on a retype, and on a 20-second timeout — and an
 * action offers no way to. The client can stop *listening* to an action, but the
 * request keeps running, which here means an OpenAI call that is paid for and
 * whose answer nobody will read. A `fetch` the caller holds a signal for hangs up
 * on the socket, and Nest sees the disconnect.
 *
 * So the shape is deliberate: not the catch-all proxy this replaces, which was a
 * Route Handler by the letter and made every Nest endpoint reachable from client
 * JS, but one route for the one call with a reason. It adds the `Authorization`
 * header from the httpOnly cookie that client JS cannot read, and forwards
 * nothing else.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    // No redirect: the caller is a `fetch()`, and a page of login HTML is not an
    // answer it can use. `proxy.ts` has already tried to renew by this point, so
    // arriving here without a token means there was no session to renew.
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Parsed here rather than passed through: this is a public POST endpoint like
  // any action, and forwarding an unvalidated body would make Nest's schema the
  // only check on a request that has already crossed one trust boundary. The
  // `json()` is guarded too — it throws on a body that is not JSON at all, which
  // is a malformed request and not a fault of ours.
  const body = await request.json().catch(() => null);
  const parsed = aiParseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: 'Validation failed' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(nestUrl('/meals/ai-parse'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        // The parse route is rate-limited per client IP, so the real address has
        // to survive the hop through here.
        ...forwardedFor(request.headers),
      },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
      // The drawer's abort has to reach Nest, not stop at this handler: without
      // this, a cancelled parse still costs a completed OpenAI call.
      signal: request.signal,
    });
  } catch (err) {
    // The abort above rejects here, and it is the expected end of a cancelled
    // parse, not a fault: the client has already hung up, so nothing will read
    // this. Letting it throw would log a function error for every cancel.
    if (request.signal.aborted) return new Response(null, { status: 499 });
    throw err;
  }

  // The status carries meaning the drawer branches on — 429 becomes a field
  // error rather than the error step — so it is passed through as it arrived.
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
