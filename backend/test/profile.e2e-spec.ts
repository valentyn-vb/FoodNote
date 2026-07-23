import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { ProfileResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Profile (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const EMAIL = 'profile-e2e@example.com';
  const PASSWORD = 'profile e2e password';
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const PROFILE = {
    age: 30,
    sex: 'male' as const,
    heightCm: 180,
    activityLevel: 'moderate' as const,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(201);
    token = (reg.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
    await app.close();
  });

  it('GET /profile is 404 before onboarding', async () => {
    await request(app.getHttpServer())
      .get('/api/profile')
      .set(auth())
      .expect(404);
  });

  it('PUT /profile creates the profile (200), derived fields null (no weight)', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/profile')
      .set(auth())
      .send(PROFILE)
      .expect(200);
    const body = res.body as ProfileResponse;
    expect(body.age).toBe(30);
    expect(body.currentWeightKg).toBeNull();
    expect(body.maintenanceCalories).toBeNull();
    expect(body.calorieTarget).toBeNull();
  });

  it('maintenanceCalories appears once a weight exists; calorieTarget still null (no goal)', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(auth())
      .send({ weightKg: 85, recordedAt: '2026-07-20T08:00:00.000Z' })
      .expect(201);

    const body = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth())
        .expect(200)
    ).body as ProfileResponse;
    expect(body.currentWeightKg).toBe(85);
    expect(typeof body.maintenanceCalories).toBe('number');
    expect(body.calorieTarget).toBeNull();
  });

  it('calorieTarget computes once an active goal exists', async () => {
    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 0.5 })
      .expect(201);

    const body = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth())
        .expect(200)
    ).body as ProfileResponse;
    expect(typeof body.calorieTarget).toBe('number');
    expect(body.calorieTarget!).toBeLessThan(body.maintenanceCalories!);
  });

  it('PATCH /profile partially edits', async () => {
    const body = (
      await request(app.getHttpServer())
        .patch('/api/profile')
        .set(auth())
        .send({ activityLevel: 'active' })
        .expect(200)
    ).body as ProfileResponse;
    expect(body.activityLevel).toBe('active');
    expect(body.age).toBe(30);
  });

  it('PATCH /profile is 404 when no profile exists (not an upsert)', async () => {
    const PATCH_404_EMAIL = 'profile-patch404-e2e@example.com';
    const PATCH_404_PASSWORD = 'profile patch 404 password';
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: PATCH_404_EMAIL });

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: PATCH_404_EMAIL, password: PATCH_404_PASSWORD })
      .expect(201);
    const patch404Token = (reg.body as { accessToken: string }).accessToken;

    await request(app.getHttpServer())
      .patch('/api/profile')
      .set({ Authorization: `Bearer ${patch404Token}` })
      .send({ activityLevel: 'active' })
      .expect(404);

    await users.delete({ email: PATCH_404_EMAIL });
  });

  it('a second PUT /profile replaces the row (create-or-replace, not stale)', async () => {
    const UPDATED_PROFILE = {
      age: 31,
      sex: 'male' as const,
      heightCm: 182,
      activityLevel: 'active' as const,
    };

    const putBody = (
      await request(app.getHttpServer())
        .put('/api/profile')
        .set(auth())
        .send(UPDATED_PROFILE)
        .expect(200)
    ).body as ProfileResponse;
    expect(putBody.age).toBe(31);
    expect(putBody.heightCm).toBe(182);

    const getBody = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth())
        .expect(200)
    ).body as ProfileResponse;
    expect(getBody.age).toBe(31);
    expect(getBody.heightCm).toBe(182);
  });
});
