import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { seedDemoAccount } from '../src/database/seed';
import { Goal } from '../src/goal/goal.entity';
import { MealEntry } from '../src/meal/meal-entry.entity';
import { SavedMeal } from '../src/saved-meal/saved-meal.entity';
import { User } from '../src/user/user.entity';
import { WeightEntry } from '../src/weight/weight-entry.entity';
import { App } from 'supertest/types';
import { createTestApp } from './create-test-app';

describe('seedDemoAccount (e2e)', () => {
  let app: INestApplication<App>;
  let users: Repository<User>;
  let weights: Repository<WeightEntry>;
  let meals: Repository<MealEntry>;
  let savedMeals: Repository<SavedMeal>;
  let goals: Repository<Goal>;

  const EMAIL = 'e2e-seed-demo@example.com';
  const PASSWORD = 'e2e test password';

  async function rowCounts(userId: string) {
    return {
      weights: await weights.count({ where: { userId } }),
      meals: await meals.count({ where: { userId } }),
      goals: await goals.count({ where: { userId } }),
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
    users = app.get<Repository<User>>(getRepositoryToken(User));
    weights = app.get<Repository<WeightEntry>>(getRepositoryToken(WeightEntry));
    meals = app.get<Repository<MealEntry>>(getRepositoryToken(MealEntry));
    savedMeals = app.get<Repository<SavedMeal>>(getRepositoryToken(SavedMeal));
    goals = app.get<Repository<Goal>>(getRepositoryToken(Goal));
  });

  // Each test needs its own clean slate — cascades (onDelete: 'CASCADE' on
  // weights/meals/goal) take the rest with the user. Without this, the two
  // tests below depend on execution order, which is exactly the bug this
  // caught on the first run: the idempotency test's "first" call inherited
  // state left by the previous test instead of starting fresh.
  beforeEach(async () => {
    await users.delete({ email: EMAIL });
  });

  afterAll(async () => {
    await users.delete({ email: EMAIL });
    await app.close();
  });

  it('creates a user with ~3 months of weights and meals, and exactly one active goal', async () => {
    const result = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });

    expect(result.created).toBe(true);
    expect(result.weightCount).toBeGreaterThan(15);
    expect(result.mealCount).toBeGreaterThan(60);

    const counts = await rowCounts(result.userId);
    expect(counts.weights).toBe(result.weightCount);
    expect(counts.meals).toBe(result.mealCount);
    expect(counts.goals).toBe(1);

    const goal = await goals.findOneOrFail({
      where: { userId: result.userId },
    });
    expect(goal.status).toBe('active');

    // The real, load-bearing behavior from the file header: startWeightKg is
    // whichever weight entry is most recently recorded, not the oldest one.
    const latestWeight = await weights.findOne({
      where: { userId: result.userId },
      order: { recordedAt: 'DESC' },
    });
    expect(Number(goal.startWeightKg)).toBe(Number(latestWeight!.weightKg));
  });

  it('is idempotent — a second run for the same email creates nothing new', async () => {
    const first = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });
    expect(first.created).toBe(true);

    const before = await rowCounts(first.userId);
    const second = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });
    const after = await rowCounts(first.userId);

    expect(second.created).toBe(false);
    expect(after).toEqual(before);
    // Same account, and nothing was missing — so the run reports no writes.
    expect(second.userId).toBe(first.userId);
    expect(second.weightCount).toBe(0);
    expect(second.mealCount).toBe(0);
    expect(second.savedMealCount).toBe(0);
  });

  // The reason the skip became a top-up: the demo account is the one anybody
  // presents from, so it has to be refillable in place rather than deleted and
  // re-seeded.
  it('tops up what is missing on an account that already exists', async () => {
    const first = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });
    const before = await rowCounts(first.userId);

    // A gap of the kind a top-up exists to close: a whole day's weigh-in, one
    // day's lunch, and a Saved Meal.
    const oldestWeight = await weights.findOneOrFail({
      where: { userId: first.userId },
      order: { recordedAt: 'ASC' },
    });
    await weights.delete({ id: oldestWeight.id });
    const someLunch = await meals.findOneOrFail({
      where: { userId: first.userId, mealType: 'lunch' },
      order: { recordedAt: 'ASC' },
    });
    await meals.delete({ id: someLunch.id });
    const savedBefore = await savedMeals.count({
      where: { userId: first.userId },
    });
    const someSaved = await savedMeals.findOneOrFail({
      where: { userId: first.userId },
    });
    await savedMeals.delete({ id: someSaved.id });

    const again = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });

    expect(again.created).toBe(false);
    expect(again.weightCount).toBe(1);
    expect(again.mealCount).toBe(1);
    expect(again.savedMealCount).toBe(1);
    expect(await rowCounts(first.userId)).toEqual(before);
    expect(await savedMeals.count({ where: { userId: first.userId } })).toBe(
      savedBefore,
    );
    // Still one goal, and still the original one: a top-up must not replace a
    // goal, which would reset startWeightKg and startDate to today.
    const goal = await goals.findOneOrFail({
      where: { userId: first.userId },
    });
    expect(goal.status).toBe('active');
  });
});
