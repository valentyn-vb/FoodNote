import { z } from 'zod';

/**
 * The only reader of `process.env` in the frontend.
 *
 * Parsed at module load, which means `next.config.ts` importing this file turns
 * a bad environment into a *build* failure. The alternative — reading
 * `process.env` where it is needed — defers the error to the first request on
 * each cold serverless instance, i.e. to a user, one instance at a time.
 *
 * Server-only. Nothing here is `NEXT_PUBLIC_`, so importing it from a client
 * component is a build error, which is the intended guard rail.
 */
const envSchema = z.object({
  /**
   * Where Nest lives. Required, with no default: the localhost fallback existed
   * only while the `/api/*` rewrite did, and it died with it. Every call to Nest
   * is now server-to-server, so a missing value is not a degraded app but no app
   * at all — and because `next.config.ts` imports this module, it fails the build
   * rather than the first request on each cold instance. `frontend/.env.example`
   * carries the local value.
   */
  API_URL: z.url(),

  /**
   * Set by Next itself, never by a `.env` file. It is here so that `cookies.ts`
   * can decide the `secure` flag without reaching for `process.env` directly and
   * making this module's "only reader" claim false on its first day.
   */
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export const env = envSchema.parse(process.env);
