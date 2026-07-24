import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  DashboardResponse,
  GoalResponse,
  ProfileResponse,
} from '@foodnote/shared';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MealEntry } from '../src/meal/meal-entry.entity';
import { User } from '../src/user/user.entity';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let userId: string;
  let meals: Repository<MealEntry>;
  const EMAIL = 'dashboard-e2e@example.com';
  const PASSWORD = 'dashboard e2e password';

  // Fixed Tracking Days so seeded totals are deterministic regardless of when
  // the suite runs: DAY has two meals, OTHER_DAY one (to prove scoping),
  // EMPTY_DAY none.
  const DAY = '2026-07-20';
  const OTHER_DAY = '2026-07-19';
  const EMPTY_DAY = '2026-07-01';

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const seedMeal = (
    overrides: Partial<MealEntry> & { recordedAt: Date },
  ): Promise<MealEntry> =>
    meals.save(
      meals.create({
        userId,
        mealName: 'Seeded meal',
        mealType: 'lunch',
        totalCalories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        source: 'manual',
        ...overrides,
      }),
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL });
    meals = app.get<Repository<MealEntry>>(getRepositoryToken(MealEntry));

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: EMAIL,
        password: PASSWORD,
      })
      .expect(201);
    token = (reg.body as { accessToken: string }).accessToken;
    userId = (reg.body as { user: { id: string } }).user.id;
  });

  afterAll(async () => {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    await users.delete({ email: EMAIL }); // meal_entries cascade on user delete
    await app.close();
  });

  it('is 401 without a token', async () => {
    await request(app.getHttpServer()).get('/api/dashboard').expect(401);
  });

  it('is 404 before a profile exists', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set(auth())
      .expect(404);
  });

  it('is 404 with a profile but no active goal', async () => {
    await request(app.getHttpServer())
      .put('/api/profile')
      .set(auth())
      .send({ age: 30, sex: 'female', heightCm: 168, activityLevel: 'light' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/dashboard')
      .set(auth())
      .expect(404);
  });

  it('returns the aggregate once onboarding is complete', async () => {
    await request(app.getHttpServer())
      .post('/api/weights')
      .set(auth())
      .send({ weightKg: 78, recordedAt: `${DAY}T07:00:00.000Z` })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({ targetWeightKg: 68, preferredWeeklyChangeKg: 0.5 })
      .expect(201);

    // Two meals on DAY, plus one on OTHER_DAY that must be excluded from DAY.
    await seedMeal({
      recordedAt: new Date(`${DAY}T08:00:00.000Z`),
      totalCalories: 500,
      proteinGrams: 30,
      carbsGrams: 60,
      fatGrams: 15,
    });
    await seedMeal({
      recordedAt: new Date(`${DAY}T12:40:00.000Z`),
      totalCalories: 690,
      proteinGrams: 45,
      carbsGrams: 70,
      fatGrams: 20,
      source: 'ai',
    });
    await seedMeal({
      recordedAt: new Date(`${OTHER_DAY}T12:00:00.000Z`),
      totalCalories: 999,
      proteinGrams: 99,
      carbsGrams: 99,
      fatGrams: 99,
    });

    const body = (
      await request(app.getHttpServer())
        .get(`/api/dashboard?date=${DAY}`)
        .set(auth())
        .expect(200)
    ).body as DashboardResponse;

    expect(body.date).toBe(DAY);

    // today totals sum only DAY's meals; the EMPTY_DAY meal is excluded.
    expect(body.today).toEqual({
      totalCalories: 1190,
      proteinGrams: 75,
      carbsGrams: 130,
      fatGrams: 35,
      mealsLogged: 2,
    });

    // Calorie tiles match the profile read path (no drift).
    const profile = (
      await request(app.getHttpServer())
        .get('/api/profile')
        .set(auth())
        .expect(200)
    ).body as ProfileResponse;
    expect(body.maintenanceCalories).toBe(profile.maintenanceCalories);
    expect(body.calorieTarget).toBe(profile.calorieTarget);

    // Goal block matches the goals read path plus the derived current weight.
    const goal = (
      await request(app.getHttpServer())
        .get('/api/goals/current')
        .set(auth())
        .expect(200)
    ).body as GoalResponse;
    expect(body.goal).toEqual({
      startWeightKg: goal.startWeightKg,
      currentWeightKg: 78,
      targetWeightKg: goal.targetWeightKg,
      projectedGoalDate: goal.projectedGoalDate,
    });
  });

  it('scopes today totals to the requested day', async () => {
    const body = (
      await request(app.getHttpServer())
        .get(`/api/dashboard?date=${OTHER_DAY}`)
        .set(auth())
        .expect(200)
    ).body as DashboardResponse;

    expect(body.date).toBe(OTHER_DAY);
    expect(body.today).toEqual({
      totalCalories: 999,
      proteinGrams: 99,
      carbsGrams: 99,
      fatGrams: 99,
      mealsLogged: 1,
    });
  });

  it('returns zeroed today totals for a day with no meals', async () => {
    const body = (
      await request(app.getHttpServer())
        .get(`/api/dashboard?date=${EMPTY_DAY}`)
        .set(auth())
        .expect(200)
    ).body as DashboardResponse;

    expect(body.date).toBe(EMPTY_DAY);
    expect(body.today).toEqual({
      totalCalories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      mealsLogged: 0,
    });
  });

  it('rejects a malformed date', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard?date=not-a-date')
      .set(auth())
      .expect(400);
  });
});
