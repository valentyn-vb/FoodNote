import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { seedDemoAccount } from '../src/database/seed';
import { Goal } from '../src/goal/goal.entity';
import { MealEntry } from '../src/meal/meal-entry.entity';
import { User } from '../src/user/user.entity';
import { WeightEntry } from '../src/weight/weight-entry.entity';
import { App } from 'supertest/types';
import { createTestApp } from './create-test-app';

describe('seedDemoAccount (e2e)', () => {
  let app: INestApplication<App>;
  let users: Repository<User>;
  let weights: Repository<WeightEntry>;
  let meals: Repository<MealEntry>;
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

  it('creates a user with ~3 weeks of weights and meals, and exactly one active goal', async () => {
    const result = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });

    expect(result.created).toBe(true);
    if (!result.created) return; // narrows the union for TS below

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
    if (!first.created) return;

    const before = await rowCounts(first.userId);
    const second = await seedDemoAccount(app, {
      email: EMAIL,
      password: PASSWORD,
    });
    const after = await rowCounts(first.userId);

    expect(second.created).toBe(false);
    expect(after).toEqual(before);
  });
});
