import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  AuthResponse,
  CreateMealRequest,
  MealResponse,
} from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.entity';

describe('Meals API (e2e)', () => {
  let app: INestApplication<App>;
  let ownerToken: string;
  let otherToken: string;

  const OWNER_EMAIL = 'e2e-meals-owner@example.com';
  const OTHER_EMAIL = 'e2e-meals-other@example.com';
  const PASSWORD = 'e2e test password';

  const manualMeal: CreateMealRequest = {
    mealName: 'Chicken and rice',
    mealType: 'lunch',
    recordedAt: '2026-07-10T12:00:00.000Z',
    totalCalories: 600,
    proteinGrams: 45,
    carbsGrams: 60,
    fatGrams: 15,
    source: 'manual',
    items: [
      {
        name: 'Chicken breast',
        quantityDescription: '180 g',
        calories: 300,
        proteinGrams: 40,
        carbsGrams: 0,
        fatGrams: 7,
      },
      {
        name: 'White rice',
        quantityDescription: '150 g cooked',
        calories: 300,
        proteinGrams: 5,
        carbsGrams: 60,
        fatGrams: 8,
      },
    ],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    // Real Postgres — clear leftovers from previous runs (cascades to each
    // user's meal_entries, and those to meal_items, via ON DELETE CASCADE).
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

  function createMeal(token: string, body: CreateMealRequest) {
    return request(app.getHttpServer())
      .post('/api/meals')
      .set(authed(token))
      .send(body);
  }

  // 1 + 2 — the acceptance flow: create manual meal with items, then list it
  // for the day; a meal on another day is excluded by the range.
  it('creates a manual meal with items and lists it for the day', async () => {
    const created = await createMeal(ownerToken, manualMeal).expect(201);
    const body = created.body as MealResponse;
    expect(body.id).toBeTruthy();
    expect(body.source).toBe('manual');
    expect(body.totalCalories).toBe(600);
    expect(body.items).toHaveLength(2);
    expect(body.items.map((i) => i.name)).toEqual([
      'Chicken breast',
      'White rice',
    ]);

    // A meal on a different day must not appear in the single-day range.
    await createMeal(ownerToken, {
      ...manualMeal,
      mealName: 'Next-day breakfast',
      mealType: 'breakfast',
      recordedAt: '2026-07-11T08:00:00.000Z',
      items: [],
    }).expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/meals?from=2026-07-10&to=2026-07-10')
      .set(authed(ownerToken))
      .expect(200);
    const meals = list.body as MealResponse[];
    expect(meals).toHaveLength(1);
    expect(meals[0].mealName).toBe('Chicken and rice');
  });

  // 3 — edit: change a total and replace the item list.
  it('edits a meal: changes a total and replaces the items', async () => {
    const created = await createMeal(ownerToken, {
      ...manualMeal,
      recordedAt: '2026-07-12T12:00:00.000Z',
    });
    const id = (created.body as MealResponse).id;

    const res = await request(app.getHttpServer())
      .patch(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .send({
        totalCalories: 550,
        items: [
          {
            name: 'Protein shake',
            quantityDescription: '1 scoop',
            calories: 120,
            proteinGrams: 24,
            carbsGrams: 3,
            fatGrams: 1,
          },
        ],
      })
      .expect(200);

    const body = res.body as MealResponse;
    expect(body.totalCalories).toBe(550);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('Protein shake');
  });

  // 4 — delete: 204, gone from the list, and item rows cascade away.
  it('deletes a meal: 204, then gone from the list', async () => {
    const created = await createMeal(ownerToken, {
      ...manualMeal,
      recordedAt: '2026-07-13T12:00:00.000Z',
    });
    const id = (created.body as MealResponse).id;

    await request(app.getHttpServer())
      .delete(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .expect(204);

    const list = await request(app.getHttpServer())
      .get('/api/meals?from=2026-07-13&to=2026-07-13')
      .set(authed(ownerToken))
      .expect(200);
    expect((list.body as MealResponse[]).some((m) => m.id === id)).toBe(false);
  });

  // 5 — auth: every route needs a Bearer token.
  it('every meals route requires a Bearer token', async () => {
    await request(app.getHttpServer()).get('/api/meals').expect(401);
    await request(app.getHttpServer())
      .post('/api/meals')
      .send(manualMeal)
      .expect(401);
  });

  // 6 — ownership: another user's id (or a random one) is a 404, not a 403,
  // and never leaks into the owner's list.
  it("another user's meal is invisible and un-editable (404, not 403)", async () => {
    const created = await createMeal(otherToken, {
      ...manualMeal,
      mealName: "Other user's meal",
      recordedAt: '2026-07-14T12:00:00.000Z',
    });
    const id = (created.body as MealResponse).id;

    const list = await request(app.getHttpServer())
      .get('/api/meals?from=2026-07-14&to=2026-07-14')
      .set(authed(ownerToken))
      .expect(200);
    expect(list.body as MealResponse[]).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .send({ totalCalories: 1 })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .expect(404);
    await request(app.getHttpServer())
      .patch('/api/meals/00000000-0000-0000-0000-000000000000')
      .set(authed(ownerToken))
      .send({ totalCalories: 1 })
      .expect(404);
  });

  // 7 — PATCH items switch: omit leaves the breakdown untouched; [] clears it.
  it('PATCH items is presence-as-switch: omit keeps, [] clears', async () => {
    const created = await createMeal(ownerToken, {
      ...manualMeal,
      recordedAt: '2026-07-15T12:00:00.000Z',
    });
    const id = (created.body as MealResponse).id;

    // Omit items → breakdown untouched.
    const kept = await request(app.getHttpServer())
      .patch(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .send({ mealName: 'Renamed, items kept' })
      .expect(200);
    expect((kept.body as MealResponse).items).toHaveLength(2);

    // items: [] → breakdown cleared.
    const cleared = await request(app.getHttpServer())
      .patch(`/api/meals/${id}`)
      .set(authed(ownerToken))
      .send({ items: [] })
      .expect(200);
    expect((cleared.body as MealResponse).items).toHaveLength(0);
  });

  // 8 — source: ai is accepted and stored verbatim.
  it('accepts and stores source: ai', async () => {
    const created = await createMeal(ownerToken, {
      ...manualMeal,
      mealName: 'AI-parsed meal',
      source: 'ai',
      recordedAt: '2026-07-16T12:00:00.000Z',
    }).expect(201);
    expect((created.body as MealResponse).source).toBe('ai');
  });

  // 9 — validation: bad enum / missing required total → 400.
  it('rejects invalid bodies with 400', async () => {
    // Out-of-enum mealType.
    await createMeal(ownerToken, {
      ...manualMeal,
      mealType: 'brunch' as CreateMealRequest['mealType'],
    }).expect(400);

    // Missing a required total.
    const withoutCalories: Partial<CreateMealRequest> = { ...manualMeal };
    delete withoutCalories.totalCalories;
    await request(app.getHttpServer())
      .post('/api/meals')
      .set(authed(ownerToken))
      .send(withoutCalories)
      .expect(400);
  });
});
