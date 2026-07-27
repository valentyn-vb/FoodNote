import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Throttle } from '@nestjs/throttler';
import { errorResponseSchema, type AuthResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { PerUserThrottlerGuard } from '../src/common/per-user-throttler.guard';
import {
  AUTH_THROTTLE,
  MINUTE_MS,
  TOO_MANY_REQUESTS_MESSAGE,
} from '../src/common/throttle.constants';
import { User } from '../src/user/user.entity';
import { createTestApp } from './create-test-app';

const PER_USER_LIMIT = 2;

/**
 * Stand-in for POST /meals/ai-parse, which doesn't exist yet (#37). Its job is
 * to prove the ordering the real route will depend on: JwtAuthGuard populates
 * req.user, *then* the throttler reads it.
 */
@Controller('throttle-fixture')
class PerUserFixtureController {
  @Get()
  @UseGuards(JwtAuthGuard, PerUserThrottlerGuard)
  @Throttle({ default: { ttl: MINUTE_MS, limit: PER_USER_LIMIT } })
  ping(): { ok: true } {
    return { ok: true };
  }
}

describe('Rate limiting (e2e)', () => {
  describe('auth routes, per IP', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      app = await createTestApp({ throttling: true });
    });

    afterAll(() => app.close());

    // Guards run before pipes, so an invalid body still consumes the budget —
    // this exercises the limit without creating a single user.
    it(`429s after ${AUTH_THROTTLE.limit} register attempts from one IP`, async () => {
      for (let i = 0; i < AUTH_THROTTLE.limit; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({})
          .expect(400);
      }

      const blocked = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({})
        .expect(429);

      expect(blocked.headers['retry-after']).toBeDefined();
      // Parsing with the contract's own schema also asserts the 429 body is the
      // standard envelope clients already branch on.
      const error = errorResponseSchema.parse(blocked.body);
      // The library default ("ThrottlerException: Too Many Requests") would
      // reach users verbatim through the frontend's ApiError.
      expect(error.message).toBe(TOO_MANY_REQUESTS_MESSAGE);
    });

    it('leaves the health check unthrottled', async () => {
      for (let i = 0; i < AUTH_THROTTLE.limit + 2; i++) {
        await request(app.getHttpServer()).get('/api/health').expect(200);
      }
    });
  });

  describe('per-user throttling', () => {
    let app: INestApplication<App>;
    let tokenA: string;
    let tokenB: string;

    const EMAIL_A = 'throttle-a@example.com';
    const EMAIL_B = 'throttle-b@example.com';
    const PASSWORD = 'throttle test password';

    beforeAll(async () => {
      // Default (throttling: false) stubs only the *global* guard, so the
      // route-scoped PerUserThrottlerGuard below is the only thing counting.
      // That isolation is what makes the assertion meaningful: with the global
      // guard live it would read this route's @Throttle metadata too and enforce
      // the same 2/min by IP, and since both users share 127.0.0.1, user B would
      // be blocked by the global guard whether or not per-user tracking worked.
      app = await createTestApp({
        imports: [AuthModule],
        controllers: [PerUserFixtureController],
      });

      const users = app.get<Repository<User>>(getRepositoryToken(User));
      await users.delete({ email: EMAIL_A });
      await users.delete({ email: EMAIL_B });

      const register = async (email: string): Promise<string> => {
        const res = await request(app.getHttpServer())
          .post('/api/auth/register')
          .send({
            firstName: 'Throttle',
            lastName: 'Tester',
            email,
            password: PASSWORD,
          })
          .expect(201);
        return (res.body as AuthResponse).accessToken;
      };

      tokenA = await register(EMAIL_A);
      tokenB = await register(EMAIL_B);
    });

    afterAll(async () => {
      const users = app.get<Repository<User>>(getRepositoryToken(User));
      await users.delete({ email: EMAIL_A });
      await users.delete({ email: EMAIL_B });
      await app.close();
    });

    const ping = (token: string) =>
      request(app.getHttpServer())
        .get('/api/throttle-fixture')
        .set('Authorization', `Bearer ${token}`);

    it('counts against the user, not the shared IP', async () => {
      for (let i = 0; i < PER_USER_LIMIT; i++) {
        await ping(tokenA).expect(200);
      }
      await ping(tokenA).expect(429);

      // Same IP, different user — proves the tracker is req.user.id and that
      // JwtAuthGuard ran first to populate it.
      await ping(tokenB).expect(200);
    });
  });
});
