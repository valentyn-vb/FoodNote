import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { AuthResponse, RefreshResponse } from '@foodnote/shared';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;

  const FIRST_NAME = 'E2E';
  const LAST_NAME = 'Tester';
  const EMAIL = 'e2e@example.com';
  const PASSWORD = 'e2e test password';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    // The store is a real Postgres now — clear leftovers from previous runs
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
  });

  afterAll(() => app.close());

  it('runs the full flow: register → me → refresh → logout', async () => {
    // register: returns access token + user, sets refresh cookie
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        email: EMAIL,
        password: PASSWORD,
      })
      .expect(201);

    const registerBody = registerRes.body as AuthResponse;
    expect(registerBody.user.email).toBe(EMAIL);
    const accessToken = registerBody.accessToken;
    const cookies = registerRes.get('Set-Cookie');
    expect(cookies?.join(';')).toContain('refreshToken=');
    expect(cookies?.join(';')).toContain('HttpOnly');

    // me: works with the Bearer token
    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((meRes.body as { email: string }).email).toBe(EMAIL);

    // refresh: cookie alone yields a fresh access token
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookies!)
      .expect(200);
    expect(typeof (refreshRes.body as RefreshResponse).accessToken).toBe(
      'string',
    );

    // logout: clears the cookie
    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookies!)
      .expect(204);
    expect(logoutRes.get('Set-Cookie')?.join(';')).toContain('refreshToken=;');
  });

  it('login rejects bad credentials with a generic 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'wrong password' })
      .expect(401);
    expect((res.body as { message: string }).message).toBe(
      'Invalid credentials',
    );
  });

  it('me without a token is 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('refresh without the cookie is 401', async () => {
    await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
  });

  it('register with an invalid body is 400 with field errors', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    const body = res.body as { errors: Record<string, string[]> };
    expect(body.errors).toHaveProperty('firstName');
    expect(body.errors).toHaveProperty('lastName');
    expect(body.errors).toHaveProperty('email');
    expect(body.errors).toHaveProperty('password');
  });
});
