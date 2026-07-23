import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { AuthResponse, WeightEntryResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Weights API (e2e)', () => {
  let app: INestApplication<App>;
  let ownerToken: string;
  let otherToken: string;

  const OWNER_EMAIL = 'e2e-weights-owner@example.com';
  const OTHER_EMAIL = 'e2e-weights-other@example.com';
  const PASSWORD = 'e2e test password';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Real Postgres — clear leftovers from previous runs (cascades to each
    // user's weight_entries via the entity's ON DELETE CASCADE).
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: OWNER_EMAIL });
    await users.delete({ email: OTHER_EMAIL });

    const owner = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: OWNER_EMAIL, password: PASSWORD });
    ownerToken = (owner.body as AuthResponse).accessToken;

    const other = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: OTHER_EMAIL, password: PASSWORD });
    otherToken = (other.body as AuthResponse).accessToken;
  });

  afterAll(() => app.close());

  function authed(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  it('creates an entry: 201, echoes weightKg/recordedAt', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 80, recordedAt: '2026-07-01T08:00:00.000Z' })
      .expect(201);

    const body = res.body as WeightEntryResponse;
    expect(body.id).toBeTruthy();
    expect(body.weightKg).toBe(80);
    expect(body.recordedAt).toBe('2026-07-01T08:00:00.000Z');
  });

  it('a second same-day entry is a new 201, not an upsert (#27 dropped the per-day rule)', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 80, recordedAt: '2026-07-02T08:00:00.000Z' })
      .expect(201);

    // Same UTC day, different time — must NOT collapse into the first entry.
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 79.8, recordedAt: '2026-07-02T20:00:00.000Z' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/weights?from=2026-07-02&to=2026-07-02')
      .set(authed(ownerToken))
      .expect(200);
    expect(list.body as WeightEntryResponse[]).toHaveLength(2);
  });

  it('lists entries in range, own entries only, oldest first', async () => {
    // A same-day entry for the OTHER user must never leak into owner's list.
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(otherToken))
      .send({ weightKg: 60, recordedAt: '2026-07-02T09:00:00.000Z' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/weights?from=2026-07-01&to=2026-07-02')
      .set(authed(ownerToken))
      .expect(200);

    const body = res.body as WeightEntryResponse[];
    expect(body.every((e) => e.weightKg !== 60)).toBe(true);
    expect(body.map((e) => e.recordedAt)).toEqual(
      [...body.map((e) => e.recordedAt)].sort(),
    );
  });

  it('updates an owned entry: 200, changed fields reflected', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 81, recordedAt: '2026-07-03T08:00:00.000Z' });
    const id = (created.body as WeightEntryResponse).id;

    const res = await request(app.getHttpServer())
      .patch(`/api/weights/${id}`)
      .set(authed(ownerToken))
      .send({ weightKg: 80.5 })
      .expect(200);
    expect((res.body as WeightEntryResponse).weightKg).toBe(80.5);
  });

  it("updating another user's entry (or a random id) is 404, not 403", async () => {
    const created = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 82, recordedAt: '2026-07-04T08:00:00.000Z' });
    const id = (created.body as WeightEntryResponse).id;

    // Same shape whether the id belongs to someone else or doesn't exist at
    // all — never confirm to a caller that an id they don't own exists.
    await request(app.getHttpServer())
      .patch(`/api/weights/${id}`)
      .set(authed(otherToken))
      .send({ weightKg: 70 })
      .expect(404);
    await request(app.getHttpServer())
      .patch('/api/weights/00000000-0000-0000-0000-000000000000')
      .set(authed(ownerToken))
      .send({ weightKg: 70 })
      .expect(404);
  });

  it('rejects an out-of-range weightKg with 400', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 83, recordedAt: '2026-07-05T08:00:00.000Z' });
    const id = (created.body as WeightEntryResponse).id;

    await request(app.getHttpServer())
      .patch(`/api/weights/${id}`)
      .set(authed(ownerToken))
      .send({ weightKg: 500 })
      .expect(400);
  });

  it('deletes an owned entry: 204, then gone from the list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 84, recordedAt: '2026-07-06T08:00:00.000Z' });
    const id = (created.body as WeightEntryResponse).id;

    await request(app.getHttpServer())
      .delete(`/api/weights/${id}`)
      .set(authed(ownerToken))
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/api/weights?from=2026-07-06&to=2026-07-06')
      .set(authed(ownerToken))
      .expect(200);
    expect((list.body as WeightEntryResponse[]).some((e) => e.id === id)).toBe(
      false,
    );
  });

  it("deleting another user's entry (or a random id) is 404", async () => {
    const created = await request(app.getHttpServer())
      .post('/api/weights')
      .set(authed(ownerToken))
      .send({ weightKg: 85, recordedAt: '2026-07-07T08:00:00.000Z' });
    const id = (created.body as WeightEntryResponse).id;

    await request(app.getHttpServer())
      .delete(`/api/weights/${id}`)
      .set(authed(otherToken))
      .expect(404);
    await request(app.getHttpServer())
      .delete('/api/weights/00000000-0000-0000-0000-000000000000')
      .set(authed(ownerToken))
      .expect(404);
  });

  it('every weights route requires a Bearer token', async () => {
    await request(app.getHttpServer()).get('/api/weights').expect(401);
  });
});
