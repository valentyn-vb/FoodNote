import { INestApplication } from '@nestjs/common';
import type { AiParseResponse } from '@foodnote/shared';
import { errorResponseSchema, aiParseResponseSchema } from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { AI_PARSE_THROTTLE } from '../src/common/throttle.constants';
import { MealParseFailedError } from '../src/meals/meal-parser';
import { createTestApp, registerTestUser } from './create-test-app';

const PARSED: AiParseResponse = {
  parsed: true,
  meal: {
    mealName: 'Two eggs on toast',
    items: [
      {
        name: 'Eggs',
        quantityDescription: '2 large',
        calories: 143,
        proteinGrams: 13,
        carbsGrams: 1,
        fatGrams: 10,
      },
    ],
    totalCalories: 143,
    proteinGrams: 13,
    carbsGrams: 1,
    fatGrams: 10,
    confidenceNote: 'Assumed two large eggs.',
  },
};

describe('AI meal parse (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let parse: jest.Mock;

  const EMAIL = 'e2e-ai-parse@example.com';

  beforeAll(async () => {
    parse = jest.fn();
    app = await createTestApp({ mealParser: { parse } });
    token = await registerTestUser(app, EMAIL);
  });

  afterAll(() => app.close());

  beforeEach(() => parse.mockReset());

  function aiParse(description: unknown) {
    return request(app.getHttpServer())
      .post('/api/meals/ai-parse')
      .set({ Authorization: `Bearer ${token}` })
      .send({ description });
  }

  it('401s without a token', async () => {
    await request(app.getHttpServer())
      .post('/api/meals/ai-parse')
      .send({ description: 'two eggs on toast' })
      .expect(401);

    expect(parse).not.toHaveBeenCalled();
  });

  // Bad input must never reach OpenAI — this is the cheap half of cost control.
  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(501)],
    ['not a string', 42],
  ])('400s on a description that is %s', async (_case, description) => {
    await aiParse(description).expect(400);

    expect(parse).not.toHaveBeenCalled();
  });

  it('200s with a Parsed Meal, passing the caller id to the parser', async () => {
    parse.mockResolvedValue(PARSED);

    const response = await aiParse('two eggs on toast').expect(200);

    expect(aiParseResponseSchema.parse(response.body)).toEqual(PARSED);
    expect(parse).toHaveBeenCalledWith('two eggs on toast', expect.any(String));
  });

  // The contract's key asymmetry: "not food" is a 200, not a 4xx (ADR-0006).
  it('200s with parsed: false when the description is not food', async () => {
    parse.mockResolvedValue({
      parsed: false,
      reason: 'That does not describe anything edible.',
    });

    const response = await aiParse('my bicycle').expect(200);

    expect(response.body).toEqual({
      parsed: false,
      reason: 'That does not describe anything edible.',
    });
  });

  it('502s when the parse fails', async () => {
    parse.mockRejectedValue(
      new MealParseFailedError('transport', 'socket hang up'),
    );

    const response = await aiParse('two eggs on toast').expect(502);

    // The provider's own message must not leak to the user.
    const error = errorResponseSchema.parse(response.body);
    expect(error.message).not.toContain('socket hang up');
  });
});

/**
 * Separate app instance: this is the only suite that runs the real throttler, and
 * the shared one disables it.
 *
 * NOTE: this proves the route is capped at AI_PARSE_THROTTLE — it does NOT prove
 * the cap is per user. The global IP-tracked guard reads the same @Throttle
 * metadata, so both limits trip at the same count and are indistinguishable from
 * one IP. Per-user tracking is proven in per-user-throttler.guard.spec.ts.
 */
describe('AI meal parse rate limit (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const EMAIL = 'e2e-ai-parse-throttle@example.com';

  beforeAll(async () => {
    app = await createTestApp({
      throttling: true,
      mealParser: { parse: () => Promise.resolve(PARSED) },
    });
    token = await registerTestUser(app, EMAIL);
  });

  afterAll(() => app.close());

  function aiParse() {
    return request(app.getHttpServer())
      .post('/api/meals/ai-parse')
      .set({ Authorization: `Bearer ${token}` })
      .send({ description: 'two eggs on toast' });
  }

  it(`429s after ${AI_PARSE_THROTTLE.limit} parses`, async () => {
    for (let i = 0; i < AI_PARSE_THROTTLE.limit; i++) {
      await aiParse().expect(200);
    }

    await aiParse().expect(429);
  });
});
