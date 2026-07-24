import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { GoalResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Goal } from '../src/goal/goal.entity';
import { User } from '../src/user/user.entity';

describe('Goals (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let userId: string;
  const EMAIL = 'goals-e2e@example.com';
  const PASSWORD = 'goals e2e password';

  const auth = () => ({ Authorization: `Bearer ${token}` });

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
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: EMAIL,
        password: PASSWORD,
      })
      .expect(201);
    token = (reg.body as { accessToken: string; user: { id: string } })
      .accessToken;
    userId = (reg.body as { user: { id: string } }).user.id;
  });

  afterAll(async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
    await app.close();
  });

  it('GET /goals/current is 404 before any goal', async () => {
    await request(app.getHttpServer())
      .get('/api/goals/current')
      .set(auth())
      .expect(404);
  });

  it('POST /goals is 400 when no weight entry exists', async () => {
    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 0.5 })
      .expect(400);
  });

  it('POST /goals creates an active goal once a weight exists', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(auth())
      .send({ weightKg: 85, recordedAt: '2026-07-20T08:00:00.000Z' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 0.5 })
      .expect(201);
    const body = res.body as GoalResponse;
    expect(body.status).toBe('active');
    expect(body.startWeightKg).toBe(85);
    expect(body.targetWeightKg).toBe(75);
    expect(body.projectedGoalDate).not.toBeNull();
  });

  it('POST /goals rejects a non-preset pace (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 0.6 })
      .expect(400);
  });

  it('a second POST /goals replaces the first — only one active', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 70, preferredWeeklyChangeKg: 0.75 })
      .expect(201);
    const current = res.body as GoalResponse;
    expect(current.targetWeightKg).toBe(70);

    const get = await request(app.getHttpServer())
      .get('/api/goals/current')
      .set(auth())
      .expect(200);
    expect((get.body as GoalResponse).id).toBe(current.id);
  });

  it('PATCH /goals/current mutates target/pace in place (id stable)', async () => {
    const before = (
      await request(app.getHttpServer())
        .get('/api/goals/current')
        .set(auth())
        .expect(200)
    ).body as GoalResponse;

    const patched = (
      await request(app.getHttpServer())
        .patch('/api/goals/current')
        .set(auth())
        .send({ preferredWeeklyChangeKg: 0.25 })
        .expect(200)
    ).body as GoalResponse;

    expect(patched.id).toBe(before.id);
    expect(patched.preferredWeeklyChangeKg).toBe(0.25);
    expect(patched.startWeightKg).toBe(before.startWeightKg);
  });

  it('the DB index rejects a second raw active goal', async () => {
    const repo = app.get<Repository<Goal>>(getRepositoryToken(Goal));
    await expect(
      repo.insert({
        userId,
        startWeightKg: 85,
        targetWeightKg: 60,
        preferredWeeklyChangeKg: 0.5,
        startDate: '2026-07-20',
        status: 'active',
      }),
    ).rejects.toThrow();
  });
});
