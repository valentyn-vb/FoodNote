import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { AuthResponse } from '@foodnote/shared';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';
import { MealParser } from '../src/meals/meal-parser';

type TestAppOptions = {
  /**
   * Mount the 'api' global prefix, matching main.ts. Off for specs that hit
   * bare paths.
   */
  prefix?: boolean;
  /**
   * Keep the real ThrottlerGuard. Off by default: every spec shares one client
   * IP, so real limits would make unrelated suites fail as soon as one of them
   * grew a fifth auth call. Only the specs that assert a limit turn this on.
   */
  throttling?: boolean;
  /**
   * Stubs the AI Parse port. Always overridden, even when a spec has nothing to
   * do with parsing: it keeps the suite off the network and means e2e needs no
   * OPENAI_API_KEY, since replacing the provider skips the factory that reads it.
   */
  mealParser?: Pick<MealParser, 'parse'>;
};

/** Fails loudly rather than letting a spec silently exercise a dummy parse. */
const unstubbedParser: Pick<MealParser, 'parse'> = {
  parse: () =>
    Promise.reject(
      new Error(
        'MealParser was called but no stub was provided to createTestApp',
      ),
    ),
};

/**
 * Shared e2e bootstrap. Mirrors main.ts (cookie parser + global prefix) so
 * specs exercise the same request pipeline the deployed app has.
 */
export async function createTestApp({
  prefix = true,
  throttling = false,
  mealParser = unstubbedParser,
}: TestAppOptions = {}): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  builder.overrideProvider(MealParser).useValue(mealParser);

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

/**
 * Clears any leftover user with this email, registers it fresh, and returns the
 * access token. Every resource spec needs exactly this; keeping it here means a
 * change to registration is one edit rather than one per suite.
 */
export async function registerTestUser(
  app: INestApplication<App>,
  email: string,
  password = 'e2e test password',
): Promise<string> {
  const users = app.get<Repository<User>>(getRepositoryToken(User));
  await users.delete({ email });

  const registered = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ firstName: 'Test', lastName: 'User', email, password });

  return (registered.body as AuthResponse).accessToken;
}
