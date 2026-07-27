import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './docs/openapi';

/** How many diagnostic client-IP lines to emit per boot when LOG_CLIENT_IP is on. */
const CLIENT_IP_LOG_LIMIT = 20;

/**
 * Validated so a typo can't quietly disable per-IP rate limiting. Express
 * compiles a numeric 'trust proxy' to `i < val`, and `i < NaN` is always false —
 * so TRUST_PROXY_HOPS=abc (or "", or -1) would trust zero hops, resolve every
 * request to the proxy's own address, and put all clients in a single bucket.
 * With auth capped at 5/min that locks the whole app out of login, silently.
 */
function readTrustProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS?.trim();
  if (!raw) return 0;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error(
      `TRUST_PROXY_HOPS must be a non-negative integer, got "${raw}".`,
    );
  }
  return hops;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Rate limiting tracks clients by req.ip, so Express has to be told how deep
  // the proxy chain is. A *numeric* hop count makes Express resolve the address
  // from the right of X-Forwarded-For, past any entries the client injected —
  // unlike `true`, which takes the left-most entry and lets anyone mint a fresh
  // rate-limit bucket by forging the header.
  //
  // Default 0 (trust nothing) is correct for local dev. On Render the real count
  // must be measured, not guessed: deploy once with LOG_CLIENT_IP=true and read
  // the chain logged below. Setting it too LOW resolves every request to the
  // load balancer's address, putting all users in one bucket — which would lock
  // everyone out of login at 5/min.
  const trustProxyHops = readTrustProxyHops();
  app.set('trust proxy', trustProxyHops);

  if (process.env.LOG_CLIENT_IP === 'true') {
    const logger = new Logger('ClientIp');
    let logged = 0;
    // Capped: this is a one-off measurement aid, and client IPs are personal
    // data — a flag left on shouldn't mean logging every request forever.
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

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });
  // Swagger UI at /api/docs, raw spec at /api/openapi.json — generated from
  // the shared Zod schemas (see docs/openapi.ts).
  SwaggerModule.setup('api/docs', app, buildOpenApiDocument(), {
    jsonDocumentUrl: 'api/openapi.json',
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
