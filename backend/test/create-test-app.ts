import { INestApplication } from '@nestjs/common';
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
   * Keep the real ThrottlerGuard. Off by default: every spec shares one client
   * IP, so real limits would make unrelated suites fail as soon as one of them
   * grew a fifth auth call. Only throttle.e2e-spec.ts turns this on.
   */
  throttling?: boolean;
};

/**
 * Shared e2e bootstrap. Mirrors main.ts (cookie parser + global prefix) so
 * specs exercise the same request pipeline the deployed app has.
 */
export async function createTestApp({
  prefix = true,
  throttling = false,
}: TestAppOptions = {}): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (!throttling) {
    // Works because app.module.ts registers ThrottlerGuard as a normal
    // provider and aliases APP_GUARD to it — see the comment there.
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
