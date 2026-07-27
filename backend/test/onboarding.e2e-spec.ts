import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { GoalResponse, ProfileResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Onboarding flow (e2e)', () => {
  let app: INestApplication<App>;
  const EMAIL = 'onboarding-e2e@example.com';
  const PASSWORD = 'onboarding e2e password';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
  });

  afterAll(async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
    await app.close();
  });

  it('register → PUT /profile → POST /weights → POST /goals → computed target', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: EMAIL,
        password: PASSWORD,
      })
      .expect(201);
    const token = (reg.body as { accessToken: string }).accessToken;
    const auth = { Authorization: `Bearer ${token}` };

    await request(app.getHttpServer())
      .put('/api/profile')
      .set(auth)
      .send({ age: 30, sex: 'female', heightCm: 168, activityLevel: 'light' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/weights')
      .set(auth)
      .send({ weightKg: 78, recordedAt: '2026-07-22T07:00:00.000Z' })
      .expect(201);

    const goal = (
      await request(app.getHttpServer())
        .post('/api/goals')
        .set(auth)
        .send({ targetWeightKg: 68, preferredWeeklyChangeKg: 0.5 })
        .expect(201)
    ).body as GoalResponse;
    expect(goal.startWeightKg).toBe(78);
    expect(goal.projectedGoalDate).not.toBeNull();

    const profile = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth)
        .expect(200)
    ).body as ProfileResponse;
    expect(typeof profile.calorieTarget).toBe('number');
    expect(profile.calorieTarget!).toBeGreaterThanOrEqual(1200); // female floor
    expect(profile.calorieTarget!).toBeLessThan(profile.maintenanceCalories!);

    const current = (
      await request(app.getHttpServer())
        .get('/api/goals/current')
        .set(auth)
        .expect(200)
    ).body as GoalResponse;
    expect(current.id).toBe(goal.id);
  });
});
