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
   * Where Nest lives. The localhost default is load-bearing only while the
   * `/api/*` rewrite in `next.config.ts` still exists: today the browser reaches
   * Nest through that rewrite, and every developer would otherwise need this set
   * to run the app at all. When the rewrite is deleted and every call becomes
   * server-to-server, the default goes with it and this becomes required — that
   * is the point at which a missing `API_URL` should stop the build.
   */
  API_URL: z.url().default('http://localhost:3001'),

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
