import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** How many client-IP lines to log per boot when LOG_CLIENT_IP is on. */
const CLIENT_IP_LOG_LIMIT = 20;

/**
 * Reads TRUST_PROXY_HOPS and fails fast on a bad value. Express turns a numeric
 * 'trust proxy' into `i < val`, and `i < NaN` is always false — so a typo would
 * trust zero hops, resolve every request to the proxy's address and put all
 * clients in one bucket. With login capped at 5/min that locks everyone out.
 */
export function readTrustProxyHops(raw = process.env.TRUST_PROXY_HOPS): number {
  const value = raw?.trim();
  if (!value) return 0;
  const hops = Number(value);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(
      `TRUST_PROXY_HOPS must be a non-negative integer, got "${value}".`,
    );
  }
  return hops;
}

/**
 * Tells Express how deep the proxy chain is, so rate limiting sees the real
 * client IP in req.ip.
 *
 * A hop *count* makes Express read X-Forwarded-For from the right, past any
 * entries the client added. `true` would take the left-most entry, letting
 * anyone forge the header and get a fresh rate-limit bucket.
 *
 * The default 0 (trust nothing) is right for local dev. On Render the real
 * count has to be measured: deploy once with LOG_CLIENT_IP=true and read the
 * chain from the logs.
 */
export function configureTrustProxy(app: NestExpressApplication): void {
  const trustProxyHops = readTrustProxyHops();
  app.set('trust proxy', trustProxyHops);

  if (process.env.LOG_CLIENT_IP !== 'true') return;

  const logger = new Logger('ClientIp');
  let logged = 0;
  // Capped: this is a one-off measurement aid, and client IPs are personal
  // data — a flag left on shouldn't log every request forever.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (logged < CLIENT_IP_LOG_LIMIT) {
      logged += 1;
      logger.log(
        JSON.stringify({
          xff: req.headers['x-forwarded-for'] ?? null,
          ips: req.ips,
          resolved: req.ip,
          trustProxyHops,
        }),
      );
    }
    next();
  });
}
