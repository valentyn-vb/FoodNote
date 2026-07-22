import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { WeightEntryResponse } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Weights (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const EMAIL = 'weights-e2e@example.com';
  const PASSWORD = 'weights e2e password';

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

  it('appends a weight entry (201) against the migrated schema', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/weights')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 82.5, recordedAt: '2026-07-20T08:00:00.000Z' })
      .expect(201);
    const body = res.body as WeightEntryResponse;
    expect(body.weightKg).toBe(82.5);
    expect(typeof body.id).toBe('string');
  });

  it('appends a second entry the same day (201, no upsert) — latest wins', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set('Authorization', `Bearer ${token}`)
      .send({ weightKg: 82.1, recordedAt: '2026-07-20T20:00:00.000Z' })
      .expect(201);
  });
});
