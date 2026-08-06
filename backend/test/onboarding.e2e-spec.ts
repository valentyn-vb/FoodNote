import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  GoalResponse,
  ListWeightsResponse,
  ProfileResponse,
} from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { User } from '../src/user/user.entity';
import { createTestApp, registerTestUser } from './create-test-app';

describe('Onboarding flow (e2e)', () => {
  let app: INestApplication<App>;
  const EMAIL = 'onboarding-e2e@example.com';

  const PLAN = {
    age: 30,
    sex: 'female',
    heightCm: 168,
    activityLevel: 'light',
    currentWeightKg: 78,
    targetWeightKg: 68,
    preferredWeeklyChangeKg: 0.5,
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
    await app.close();
  });

  it('register → POST /plan → the profile, the journal and the goal all exist', async () => {
    const token = await registerTestUser(app, EMAIL);
    const auth = { Authorization: `Bearer ${token}` };

    const goal = (
      await request(app.getHttpServer())
        .post('/api/plan')
        .set(auth)
        .send(PLAN)
        .expect(201)
    ).body as GoalResponse;

    // startWeightKg comes from the entry the same transaction wrote — the point
    // of the endpoint.
    expect(goal.startWeightKg).toBe(78);
    expect(goal.targetWeightKg).toBe(68);
    expect(goal.projectedGoalDate).not.toBeNull();

    const profile = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth)
        .expect(200)
    ).body as ProfileResponse;
    expect(profile.age).toBe(30);
    expect(profile.currentWeightKg).toBe(78);
    expect(typeof profile.calorieTarget).toBe('number');
    expect(profile.calorieTarget!).toBeGreaterThanOrEqual(1200); // female floor
    expect(profile.calorieTarget!).toBeLessThan(profile.maintenanceCalories!);

    const entries = (
      await request(app.getHttpServer())
        .get('/api/weights')
        .set(auth)
        .expect(200)
    ).body as ListWeightsResponse;
    expect(entries).toHaveLength(1);
    // The server stamps the moment, so the entry is dated now and not by a
    // client clock.
    expect(Date.parse(entries[0].recordedAt)).toBeLessThanOrEqual(Date.now());

    const current = (
      await request(app.getHttpServer())
        .get('/api/goals/current')
        .set(auth)
        .expect(200)
    ).body as GoalResponse;
    expect(current.id).toBe(goal.id);
  });

  it('409s on a second plan, and appends nothing', async () => {
    const auth = {
      Authorization: `Bearer ${await registerTestUser(app, EMAIL)}`,
    };

    await request(app.getHttpServer())
      .post('/api/plan')
      .set(auth)
      .send(PLAN)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/plan')
      .set(auth)
      .send({ ...PLAN, currentWeightKg: 77 })
      .expect(409);

    // The rejection is the whole reason this is not a PUT: a second call would
    // otherwise leave a spare journal entry behind.
    const entries = (
      await request(app.getHttpServer())
        .get('/api/weights')
        .set(auth)
        .expect(200)
    ).body as ListWeightsResponse;
    expect(entries).toHaveLength(1);
  });
});
