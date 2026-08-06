import 'reflect-metadata';
import { ConflictException, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type {
  CreateMealRequest,
  CreateSavedMealRequest,
} from '@foodnote/shared';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { UsersRepository } from '../users/users.repository';
import { GoalsService } from '../goal/goals.service';
import { MealsService } from '../meals/meals.service';
import { ProfileService } from '../profile/profile.service';
import { SavedMealsService } from '../saved-meals/saved-meals.service';
import { WeightsService } from '../weights/weights.service';

/**
 * Demo account for the presentation (#42) — ~3 months of weights/meals so the
 * dashboard charts aren't empty on a fresh clone or a fresh Neon database.
 * Goes through the same services the API uses (AuthService, ProfileService,
 * WeightsService, MealsService, GoalsService), not raw inserts, so seeded
 * data is exactly as valid as anything created through the real endpoints.
 *
 * Idempotent, and a top-up rather than a skip: an account that already exists
 * gets whatever it is missing — the days added since the last run, and anything
 * this script has learned to seed since. It used to exit on the registered
 * email, which meant the one account anybody demos from could never be
 * refreshed; deleting it to re-seed is not a thing to do to a production
 * database.
 *
 * Re-running must still never double a row (the ticket wants "charts that look
 * alive", not a data set that gets messier every time someone runs this before a
 * demo), so every write is skipped when its slot is already filled:
 *
 * - a weight, when the account already has an entry on that UTC day
 * - a meal, when that UTC day already holds one of the same meal type
 * - a Saved Meal, by name — it has no date to key on
 * - the profile, which is a PUT, and the goal, which is created only when there
 *   is no active one
 *
 * A run on a later day therefore fills the days that have passed and leaves the
 * rest alone. Covered by test/seed.e2e-spec.ts.
 *
 * Order matters: GoalsService.create reads the *latest* weight entry as
 * startWeightKg at the moment it runs (goals.service.ts). Weights and meals
 * are seeded first so the trend line has 3 months of history; the goal is
 * created last, so its startWeightKg is today's seeded weight and its
 * startDate is today — the Goal record itself can't be backdated without
 * bypassing the service layer, which this script deliberately doesn't do.
 * The charts (the actual point of this ticket) read the raw weight/meal
 * journals, not the Goal record, so this doesn't undercut the demo.
 */

// A quarter, not the three weeks this started as: the weight trend and the
// weights page both read the whole journal, and three weeks of it left the
// history page a single screen and the trend a short stub.
const DAYS = 90;

function daysAgo(n: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

type MealType = CreateMealRequest['mealType'];

/** The UTC calendar day a stamp falls on — the slot a top-up checks. */
function dayKey(at: Date): string {
  return at.toISOString().slice(0, 10);
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
  {
    mealName: 'Chicken and rice bowl',
    totalCalories: 557,
    proteinGrams: 61.2,
    carbsGrams: 56,
    fatGrams: 7.08,
    source: 'ai',
    items: [
      {
        name: 'Chicken breast, grilled',
        quantityDescription: '180 g',
        portionGrams: 180,
        per100g: {
          calories: 165,
          proteinGrams: 31,
          carbsGrams: 0,
          fatGrams: 3.6,
        },
      },
      {
        name: 'White rice, cooked',
        quantityDescription: '200 g',
        portionGrams: 200,
        per100g: {
          calories: 130,
          proteinGrams: 2.7,
          carbsGrams: 28,
          fatGrams: 0.3,
        },
      },
    ],
  },
  // The rest are totals only, which is what a meal kept from a hand-typed entry
  // looks like — and what makes the list long enough to scroll.
  {
    mealName: 'Avocado toast with a poached egg',
    totalCalories: 430,
    proteinGrams: 18,
    carbsGrams: 34,
    fatGrams: 25,
    source: 'manual',
  },
  {
    mealName: 'Caesar salad with chicken',
    totalCalories: 520,
    proteinGrams: 38,
    carbsGrams: 18,
    fatGrams: 32,
    source: 'manual',
  },
  {
    mealName: 'Banana protein smoothie',
    totalCalories: 290,
    proteinGrams: 26,
    carbsGrams: 38,
    fatGrams: 4,
    source: 'manual',
  },
  {
    mealName: 'Tuna sandwich',
    totalCalories: 410,
    proteinGrams: 28,
    carbsGrams: 42,
    fatGrams: 13,
    source: 'manual',
  },
  {
    mealName: 'Overnight oats with berries',
    totalCalories: 350,
    proteinGrams: 14,
    carbsGrams: 52,
    fatGrams: 9,
    source: 'manual',
  },
];

/** The counts are what this run *wrote* — all zero for an account already full. */
export type SeedResult = {
  /** False when the account was already there and this run only topped it up. */
  created: boolean;
  userId: string;
  weightCount: number;
  mealCount: number;
  savedMealCount: number;
};

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

  const users = app.get(UsersRepository);

  let userId: string;
  let created = true;
  try {
    const { user } = await auth.register({
      firstName: 'Demo',
      lastName: 'Account',
      email,
      password,
    });
    userId = user.id;
  } catch (err) {
    if (!(err instanceof ConflictException)) throw err;
    // Already registered — the account is the thing being demoed, so it is
    // topped up in place. The password is left as whoever registered it set it:
    // this script has no business resetting a credential it did not create.
    created = false;
    const existing = await users.findByEmail(email);
    if (!existing) throw err;
    userId = existing.id;
  }

  // What the account already holds, read once: three queries instead of one per
  // candidate row, which for a quarter of days is ~380 round trips to Neon.
  const existingWeightDays = new Set(
    (await weights.list(userId)).map((entry) => dayKey(entry.recordedAt)),
  );
  const existingMealSlots = new Set(
    (await meals.list(userId)).map(
      (entry) => `${dayKey(entry.recordedAt)}:${entry.mealType}`,
    ),
  );
  const existingSavedMealNames = new Set(
    (await savedMeals.list(userId)).map((saved) => saved.mealName),
  );

  await profiles.put(userId, {
    age: 34,
    sex: 'male',
    heightCm: 178,
    activityLevel: 'moderate',
  });

  // Oldest first, ~88.5kg → ~79.8kg with light day-to-day noise: today's figure
  // is unchanged, so the goal below still has 4.8kg to go — the drop is spread
  // over the quarter at roughly the 0.5kg/week the plan asks for.
  const startKg = 88.5;
  const totalDropKg = 8.7;
  let weightCount = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    // About one missed weigh-in a week, at fixed offsets — a real person doesn't
    // step on the scale every single day.
    if (i % 7 === 3) continue;
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
    if (existingWeightDays.has(dayKey(recordedAt))) continue;
    await weights.create(userId, {
      weightKg,
      recordedAt: recordedAt.toISOString(),
    });
    weightCount++;
  }

  // One meal type per day is one slot: a day that already holds a lunch keeps
  // the one it has, whoever wrote it. Returns what it wrote, so the caller's
  // count is of rows and not of attempts.
  async function addMeal(
    dayOffset: number,
    hour: number,
    mealType: MealType,
    food: { name: string; kcal: number; p: number; c: number; f: number },
  ): Promise<number> {
    const recordedAt = daysAgo(dayOffset, hour, 0);
    if (existingMealSlots.has(`${dayKey(recordedAt)}:${mealType}`)) return 0;
    await meals.create(userId, {
      mealName: food.name,
      mealType,
      recordedAt: recordedAt.toISOString(),
      totalCalories: food.kcal,
      proteinGrams: food.p,
      carbsGrams: food.c,
      fatGrams: food.f,
      source: 'manual',
    });
    return 1;
  }

  let mealCount = 0;
  for (let i = DAYS - 1; i >= 0; i--) {
    mealCount += await addMeal(
      i,
      8,
      'breakfast',
      BREAKFASTS[i % BREAKFASTS.length],
    );
    mealCount += await addMeal(
      i,
      13,
      'lunch',
      LUNCHES[(i + 1) % LUNCHES.length],
    );
    mealCount += await addMeal(
      i,
      19,
      'dinner',
      DINNERS[(i + 2) % DINNERS.length],
    );
    // A snack on roughly every third day — variety, not every single day.
    if (i % 3 === 0) {
      mealCount += await addMeal(i, 16, 'snack', SNACKS[i % SNACKS.length]);
    }
  }

  // No dates and no Tracking Day: a Saved Meal has no occasion, so unlike the
  // meals above these are not spread across the days — which leaves the name as
  // the only thing a top-up can match them on.
  let savedMealCount = 0;
  for (const savedMeal of SAVED_MEALS) {
    if (existingSavedMealNames.has(savedMeal.mealName)) continue;
    await savedMeals.create(userId, savedMeal);
    savedMealCount++;
  }

  // Last, on purpose — see the file header. startWeightKg reads today's
  // seeded weight; the trend the goal measures progress against is real. An
  // account that already has an active goal keeps it: replacing it would move
  // startWeightKg and startDate to today and throw away the progress the
  // dashboard is meant to show.
  if (!(await goals.getActiveGoal(userId))) {
    await goals.create(userId, {
      targetWeightKg: 75,
      preferredWeeklyChangeKg: 0.5,
    });
  }

  return {
    created,
    userId,
    weightCount,
    mealCount,
    savedMealCount,
  };
}

async function main() {
  const email = process.env.SEED_DEMO_EMAIL ?? 'demo@foodnote.app';
  const password = process.env.SEED_DEMO_PASSWORD ?? 'FoodNoteDemo!2026';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const result = await seedDemoAccount(app, { email, password });

  const written = result.weightCount + result.mealCount + result.savedMealCount;

  console.log(
    result.created
      ? 'Seeded demo account:'
      : written === 0
        ? `Demo account already complete (${email}) — nothing to add.`
        : `Topped up the existing demo account (${email}):`,
  );
  console.log(`  email:    ${email}`);
  if (result.created) console.log(`  password: ${password}`);
  if (written > 0) {
    console.log(`  weights:  ${result.weightCount} entries written`);
    console.log(`  meals:    ${result.mealCount} entries written`);
    console.log(`  saved:    ${result.savedMealCount} meals kept for reuse`);
    console.log(`  span:     ${DAYS} days`);
  }

  await app.close();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
