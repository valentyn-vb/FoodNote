import { INestApplication } from '@nestjs/common';
import { errorResponseSchema } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AUTH_THROTTLE,
  TOO_MANY_REQUESTS_MESSAGE,
} from '../src/common/throttle.constants';
import { createTestApp } from './create-test-app';

describe('Rate limiting (e2e)', () => {
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
