import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { GoalResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { Goal } from '../src/goal/goal.entity';
import { User } from '../src/user/user.entity';
import { createTestApp } from './create-test-app';

describe('Goals (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let userId: string;
  const EMAIL = 'goals-e2e@example.com';
  const PASSWORD = 'goals e2e password';

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();

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

  it('POST /goals rejects a pace outside 0…1.0 (400)', async () => {
    // 0.6 was rejected here too, as a non-preset. ADR-0009 widened Pace to a
    // continuum — a manual plan derives its rate from calories and lands between
    // the presets — so only the ceiling and zero bound it now.
    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: 1.5 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 75, preferredWeeklyChangeKg: -0.25 })
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

  it('accepts a derived, non-preset pace and stores it to 2dp', async () => {
    // What a manual plan saves: the user named calories, the client derived the
    // rate, and it goes into the same field a preset card would use — no extra
    // column, no extra endpoint (ADR-0009).
    const patched = (
      await request(app.getHttpServer())
        .patch('/api/goals/current')
        .set(auth())
        .send({ preferredWeeklyChangeKg: 0.59 })
        .expect(200)
    ).body as GoalResponse;
    expect(patched.preferredWeeklyChangeKg).toBe(0.59);
    expect(patched.projectedGoalDate).not.toBeNull();

    // `goals.preferredWeeklyChangeKg` is numeric(4,2), so a finer rate rounds on
    // the way in. Read it back fresh rather than trusting the write's own echo:
    // this is the whole reason paceForCalorieTarget rounds to 2dp before saving,
    // so a previewed rate equals the stored one.
    await request(app.getHttpServer())
      .patch('/api/goals/current')
      .set(auth())
      .send({ preferredWeeklyChangeKg: 0.591 })
      .expect(200);
    expect((await current()).preferredWeeklyChangeKg).toBe(0.59);
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

  // From here the active goal is start 85 → target 70 at pace 0.25, and the
  // only weight entry is 85 kg. These cases walk it to reached and beyond.
  const current = async (): Promise<GoalResponse> =>
    (
      await request(app.getHttpServer())
        .get('/api/goals/current')
        .set(auth())
        .expect(200)
    ).body as GoalResponse;

  it('reachedTarget is false while the target is still ahead', async () => {
    const goal = await current();
    expect(goal.reachedTarget).toBe(false);
    expect(goal.projectedGoalDate).not.toBeNull();
  });

  it('a weight past the target reads as reached and drops the projection', async () => {
    // 68 kg overshoots the 70 kg target. A magnitude test would see 2 kg still
    // "remaining" and hand back a projected date; direction from startWeightKg
    // is what makes this reached.
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(auth())
      .send({ weightKg: 68, recordedAt: '2026-07-21T08:00:00.000Z' })
      .expect(201);

    const goal = await current();
    expect(goal.reachedTarget).toBe(true);
    expect(goal.projectedGoalDate).toBeNull();
  });

  it('pace 0 is a maintenance plan — accepted, and never reached', async () => {
    const before = await current();
    const patched = (
      await request(app.getHttpServer())
        .patch('/api/goals/current')
        .set(auth())
        .send({ preferredWeeklyChangeKg: 0 })
        .expect(200)
    ).body as GoalResponse;

    expect(patched.id).toBe(before.id); // a pace switch, not a new goal
    expect(patched.preferredWeeklyChangeKg).toBe(0);
    // The stale 70 kg target is still stored and the user is at 68 kg, but pace
    // is the only thing that decides what kind of plan this is.
    expect(patched.targetWeightKg).toBe(70);
    expect(patched.reachedTarget).toBe(false);
    expect(patched.projectedGoalDate).toBeNull();
  });

  it('POST /goals marks a reached outgoing goal completed', async () => {
    // Patch the diet back on: at 68 kg against a 70 kg target it is reached.
    await request(app.getHttpServer())
      .patch('/api/goals/current')
      .set(auth())
      .send({ preferredWeeklyChangeKg: 0.25 })
      .expect(200);
    const reached = await current();
    expect(reached.reachedTarget).toBe(true);

    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 65, preferredWeeklyChangeKg: 0.5 })
      .expect(201);

    const repo = app.get<Repository<Goal>>(getRepositoryToken(Goal));
    const outgoing = await repo.findOne({ where: { id: reached.id } });
    expect(outgoing?.status).toBe('completed');
  });

  it('POST /goals marks an unreached outgoing goal replaced', async () => {
    // The goal just created is start 68 → target 65, so it is not reached.
    const abandoned = await current();
    expect(abandoned.reachedTarget).toBe(false);

    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 62, preferredWeeklyChangeKg: 0.5 })
      .expect(201);

    const repo = app.get<Repository<Goal>>(getRepositoryToken(Goal));
    const outgoing = await repo.findOne({ where: { id: abandoned.id } });
    expect(outgoing?.status).toBe('replaced');
  });
});
