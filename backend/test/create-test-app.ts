import { INestApplication } from '@nestjs/common';
import type { ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

type TestAppOptions = {
  /**
   * Mount the 'api' global prefix, matching main.ts. Off for specs that hit
   * bare paths.
   */
  prefix?: boolean;
  /**
   * Keep the real global ThrottlerGuard. Off by default: every spec shares one
   * client IP, so real limits would make unrelated suites fail as soon as one of
   * them grew a fifth auth call. Only throttle.e2e-spec.ts turns this on.
   */
  throttling?: boolean;
  /** Extra modules a fixture controller needs resolved (e.g. AuthModule). */
  imports?: ModuleMetadata['imports'];
  /** Test-only controllers, for exercising route-scoped guards. */
  controllers?: ModuleMetadata['controllers'];
};

/**
 * Shared e2e bootstrap. Mirrors main.ts (cookie parser + global prefix) so
 * specs exercise the same request pipeline the deployed app has.
 */
export async function createTestApp({
  prefix = true,
  throttling = false,
  imports = [],
  controllers = [],
}: TestAppOptions = {}): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [AppModule, ...imports],
    controllers,
  });

  if (!throttling) {
    // Only the *global* guard is stubbed. Route-scoped subclasses such as
    // PerUserThrottlerGuard resolve under their own token and stay real, which
    // is what lets a fixture test per-user limits without the global per-IP
    // guard blocking first. Requires the two-step APP_GUARD binding in
    // app.module.ts — see the comment there.
    builder.overrideProvider(ThrottlerGuard).useValue({
      canActivate: () => true,
    });
  }

  const moduleFixture = await builder.compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.use(cookieParser());
  if (prefix) app.setGlobalPrefix('api');
  await app.init();
  return app;
}
