import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { AuthResponse, ProfileResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

// GET /profile derives currentWeightKg / maintenanceCalories / calorieTarget on
// every read (they are never stored). This locks in the null-tiering: no weight
// -> all null; a weight but no active goal -> currentWeightKg + maintenance;
// with an active goal -> all three.
describe('Profile API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const EMAIL = 'e2e-profile@example.com';
  const PASSWORD = 'e2e test password';
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

    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: EMAIL, password: PASSWORD });
    token = (registered.body as AuthResponse).accessToken;
  });

  afterAll(() => app.close());

  // A function, not a const — token is only set in beforeAll.
  const authed = () => ({ Authorization: `Bearer ${token}` });

  it('is 404 until the profile exists', async () => {
    await request(app.getHttpServer())
      .get('/api/profile')
      .set(authed())
      .expect(404);
  });

  it('PUT does not accept a weight, and GET is all-null before any weight is logged', async () => {
    // Weight belongs to the journal, not the profile — extra fields are ignored.
    const put = await request(app.getHttpServer())
      .put('/api/profile')
      .set(authed())
      .send({ ...PROFILE, currentWeightKg: 82 })
      .expect(200);

    const body = put.body as ProfileResponse;
    expect(body.age).toBe(30);
    expect(body.currentWeightKg).toBeNull();
    expect(body.maintenanceCalories).toBeNull();
    expect(body.calorieTarget).toBeNull();
  });

  it('derives currentWeightKg + maintenanceCalories once a weight is logged, calorieTarget still null with no goal', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed())
      .send({ weightKg: 82, recordedAt: '2026-07-20T08:00:00.000Z' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/profile')
      .set(authed())
      .expect(200);

    const body = res.body as ProfileResponse;
    expect(body.currentWeightKg).toBe(82);
    expect(body.maintenanceCalories).toBeGreaterThan(0);
    expect(body.calorieTarget).toBeNull();
  });

  it('uses the latest weight entry and derives calorieTarget once an active goal exists', async () => {
    // A later entry must win for Current Weight (latest recordedAt).
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed())
      .send({ weightKg: 81, recordedAt: '2026-07-22T08:00:00.000Z' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/goals')
      .set(authed())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 0.5 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/profile')
      .set(authed())
      .expect(200);

    const body = res.body as ProfileResponse;
    expect(body.currentWeightKg).toBe(81);
    expect(body.maintenanceCalories).toBeGreaterThan(0);
    expect(body.calorieTarget).toBeGreaterThan(0);
    // Loss goal: the target sits below maintenance.
    expect(body.calorieTarget!).toBeLessThan(body.maintenanceCalories!);
  });

  it('requires a Bearer token', async () => {
    await request(app.getHttpServer()).get('/api/profile').expect(401);
  });
});
