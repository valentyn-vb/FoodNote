import 'reflect-metadata';
import { ConflictException, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { CreateSavedMealRequest } from '@foodnote/shared';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { GoalsService } from '../goal/goals.service';
import { MealsService } from '../meals/meals.service';
import { ProfileService } from '../profile/profile.service';
import { SavedMealsService } from '../saved-meals/saved-meals.service';
import { WeightsService } from '../weights/weights.service';

/**
 * Demo account for the presentation (#42) — ~3 weeks of weights/meals so the
 * dashboard charts aren't empty on a fresh clone or a fresh Neon database.
 * Goes through the same services the API uses (AuthService, ProfileService,
 * WeightsService, MealsService, GoalsService), not raw inserts, so seeded
 * data is exactly as valid as anything created through the real endpoints.
 *
 * Idempotent: if the demo email is already registered, this exits without
 * touching anything. Re-running it is meant to be safe, not additive — a
 * second run must never double the weight/meal rows (the ticket wants
 * "charts that look alive", not a data set that gets messier every time
 * someone runs this before a demo). Covered by test/seed.e2e-spec.ts.
 *
 * Order matters: GoalsService.create reads the *latest* weight entry as
 * startWeightKg at the moment it runs (goals.service.ts). Weights and meals
 * are seeded first so the trend line has 3 weeks of history; the goal is
 * created last, so its startWeightKg is today's seeded weight and its
 * startDate is today — the Goal record itself can't be backdated without
 * bypassing the service layer, which this script deliberately doesn't do.
 * The charts (the actual point of this ticket) read the raw weight/meal
 * journals, not the Goal record, so this doesn't undercut the demo.
 */

const DAYS = 21;

function daysAgo(n: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

// Small deterministic jitter (no RNG needed) so the trend isn't a perfectly
// straight line — real scale readings wiggle ±0.1-0.3kg on water/glycogen.
function jitter(i: number): number {
  return Math.sin(i * 1.7) * 0.25;
}

const BREAKFASTS = [
  {
    name: 'Greek yogurt with berries and granola',
    kcal: 380,
    p: 22,
    c: 48,
    f: 10,
  },
  {
    name: 'Scrambled eggs and sourdough toast',
    kcal: 420,
    p: 24,
    c: 34,
    f: 20,
  },
  {
    name: 'Oatmeal with banana and peanut butter',
    kcal: 450,
    p: 15,
    c: 62,
    f: 16,
  },
];
const LUNCHES = [
  { name: 'Grilled chicken burrito bowl', kcal: 620, p: 42, c: 58, f: 22 },
  { name: 'Turkey and avocado sandwich', kcal: 540, p: 30, c: 48, f: 24 },
  { name: 'Lentil soup with a side salad', kcal: 480, p: 22, c: 60, f: 14 },
];
const DINNERS = [
  {
    name: 'Salmon, roasted potatoes and broccoli',
    kcal: 640,
    p: 38,
    c: 50,
    f: 28,
  },
  {
    name: 'Stir-fried tofu and vegetables with rice',
    kcal: 560,
    p: 24,
    c: 70,
    f: 16,
  },
  { name: 'Beef chili with cornbread', kcal: 610, p: 36, c: 52, f: 24 },
];
const SNACKS = [
  { name: 'Apple with almond butter', kcal: 210, p: 5, c: 24, f: 11 },
  { name: 'Protein shake', kcal: 180, p: 25, c: 8, f: 4 },
  { name: 'Handful of mixed nuts', kcal: 190, p: 6, c: 8, f: 16 },
];

/**
 * Saved Meals for the demo. Two carry an item breakdown with Nutrition Density,
 * which is what makes the portion-weight rescaling demoable — pick the pasta and
 * change 100 g of spaghetti to 200 g and every figure follows. The third has no
 * items, like a meal kept from a hand-typed entry, so the totals-only branch is
 * on screen too.
 *
 * The totals are the items' sum at these weights, so a freshly picked meal reads
 * as consistent before anything is touched (the server never checks — ADR-0008).
 */
const SAVED_MEALS: CreateSavedMealRequest[] = [
  {
    mealName: 'Pasta bolognese',
    totalCalories: 768,
    proteinGrams: 46.8,
    carbsGrams: 96,
    fatGrams: 22.5,
    source: 'ai',
    items: [
      {
        name: 'Spaghetti, dry',
        quantityDescription: '100 g',
        portionGrams: 100,
        per100g: {
          calories: 358,
          proteinGrams: 12.5,
          carbsGrams: 72,
          fatGrams: 1.5,
        },
      },
      {
        name: 'Bolognese sauce',
        quantityDescription: '300 g',
        portionGrams: 300,
        per100g: {
          calories: 70,
          proteinGrams: 4.5,
          carbsGrams: 8,
          fatGrams: 3,
        },
      },
      {
        name: 'Ground beef',
        quantityDescription: '80 g',
        portionGrams: 80,
        per100g: {
          calories: 250,
          proteinGrams: 26,
          carbsGrams: 0,
          fatGrams: 15,
        },
      },
    ],
  },
  {
    mealName: 'Cottage cheese with honey',
    totalCalories: 257,
    proteinGrams: 22.1,
    carbsGrams: 23.2,
    fatGrams: 8.6,
    source: 'ai',
    items: [
      {
        name: 'Cottage cheese',
        quantityDescription: '200 g',
        portionGrams: 200,
        per100g: {
          calories: 98,
          proteinGrams: 11,
          carbsGrams: 3.4,
          fatGrams: 4.3,
        },
      },
      {
        name: 'Honey',
        quantityDescription: '1 tbsp',
        portionGrams: 20,
        per100g: {
          calories: 304,
          proteinGrams: 0.3,
          carbsGrams: 82,
          fatGrams: 0,
        },
      },
    ],
  },
  {
    mealName: 'Protein shake with milk',
    totalCalories: 320,
    proteinGrams: 34,
    carbsGrams: 28,
    fatGrams: 7,
    source: 'manual',
  },
];

export type SeedResult =
  | {
      created: true;
      userId: string;
      weightCount: number;
      mealCount: number;
      savedMealCount: number;
    }
  | { created: false };

export type SeedOptions = {
  email: string;
  password: string;
};

/**
 * The seeding logic, separated from the CLI entrypoint below so it can run
 * against a test-created app context (test/seed.e2e-spec.ts) without a second
 * Nest bootstrap. Takes any INestApplicationContext — a full INestApplication
 * (e2e tests) satisfies that interface too.
 */
export async function seedDemoAccount(
  app: INestApplicationContext,
  { email, password }: SeedOptions,
): Promise<SeedResult> {
  const auth = app.get(AuthService);
  const profiles = app.get(ProfileService);
  const weights = app.get(WeightsService);
  const meals = app.get(MealsService);
  const savedMeals = app.get(SavedMealsService);
  const goals = app.get(GoalsService);

  let userId: string;
  try {
    const { user } = await auth.register({
      firstName: 'Demo',
      lastName: 'Account',
      email,
      password,
    });
    userId = user.id;
  } catch (err) {
    if (err instanceof ConflictException) {
      return { created: false };
    }
    throw err;
  }

  await profiles.put(userId, {
    age: 34,
    sex: 'male',
    heightCm: 178,
    activityLevel: 'moderate',
  });

  // 21 days, oldest first, ~82.4kg → ~79.8kg with light day-to-day noise.
  const startKg = 82.4;
  const totalDropKg = 2.6;
  let weightCount = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    // Skip two days at random-but-fixed offsets — a real person doesn't
    // weigh in every single day.
    if (i === 11 || i === 4) continue;
    const progress = (DAYS - 1 - i) / (DAYS - 1);
    const weightKg =
      Math.round((startKg - totalDropKg * progress + jitter(i)) * 10) / 10;
    // Never later than now: before 07:15 UTC today's slot is in the future, and
    // Current Weight is whichever entry has the latest recordedAt — so a
    // future-stamped seed entry outranks anything logged during a run. The
    // smoke net's weight scenario logged a weight and watched the dashboard
    // not move, on every run started before 07:15 and no other.
    //
    // Weights only. The meal stamps below are what order a Tracking Day's list,
    // and collapsing today's three onto one instant would make that order
    // arbitrary — a different flake in place of this one.
    const recordedAt = new Date(
      Math.min(daysAgo(i, 7, 15).getTime(), Date.now()),
    );
    await weights.create(userId, {
      weightKg,
      recordedAt: recordedAt.toISOString(),
    });
    weightCount++;
  }

  let mealCount = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    const b = BREAKFASTS[i % BREAKFASTS.length];
    const l = LUNCHES[(i + 1) % LUNCHES.length];
    const d = DINNERS[(i + 2) % DINNERS.length];
    await meals.create(userId, {
      mealName: b.name,
      mealType: 'breakfast',
      recordedAt: daysAgo(i, 8, 0).toISOString(),
      totalCalories: b.kcal,
      proteinGrams: b.p,
      carbsGrams: b.c,
      fatGrams: b.f,
      source: 'manual',
    });
    await meals.create(userId, {
      mealName: l.name,
      mealType: 'lunch',
      recordedAt: daysAgo(i, 13, 0).toISOString(),
      totalCalories: l.kcal,
      proteinGrams: l.p,
      carbsGrams: l.c,
      fatGrams: l.f,
      source: 'manual',
    });
    await meals.create(userId, {
      mealName: d.name,
      mealType: 'dinner',
      recordedAt: daysAgo(i, 19, 0).toISOString(),
      totalCalories: d.kcal,
      proteinGrams: d.p,
      carbsGrams: d.c,
      fatGrams: d.f,
      source: 'manual',
    });
    mealCount += 3;
    // A snack on roughly every third day — variety, not every single day.
    if (i % 3 === 0) {
      const s = SNACKS[i % SNACKS.length];
      await meals.create(userId, {
        mealName: s.name,
        mealType: 'snack',
        recordedAt: daysAgo(i, 16, 0).toISOString(),
        totalCalories: s.kcal,
        proteinGrams: s.p,
        carbsGrams: s.c,
        fatGrams: s.f,
        source: 'manual',
      });
      mealCount++;
    }
  }

  // No dates and no Tracking Day: a Saved Meal has no occasion, so unlike the
  // meals above these are not spread across the 21 days.
  for (const savedMeal of SAVED_MEALS) {
    await savedMeals.create(userId, savedMeal);
  }

  // Last, on purpose — see the file header. startWeightKg reads today's
  // seeded weight; the trend the goal measures progress against is real.
  await goals.create(userId, {
    targetWeightKg: 75,
    preferredWeeklyChangeKg: 0.5,
  });

  return {
    created: true,
    userId,
    weightCount,
    mealCount,
    savedMealCount: SAVED_MEALS.length,
  };
}

async function main() {
  const email = process.env.SEED_DEMO_EMAIL ?? 'demo@foodnote.app';
  const password = process.env.SEED_DEMO_PASSWORD ?? 'FoodNoteDemo!2026';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const result = await seedDemoAccount(app, { email, password });

  if (!result.created) {
    console.log(
      `Demo account already exists (${email}) — skipping, nothing written.`,
    );
  } else {
    console.log('Seeded demo account:');
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
    console.log(`  weights:  ${result.weightCount} entries over ${DAYS} days`);
    console.log(`  meals:    ${result.mealCount} entries over ${DAYS} days`);
    console.log(`  saved:    ${result.savedMealCount} meals kept for reuse`);
  }

  await app.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
