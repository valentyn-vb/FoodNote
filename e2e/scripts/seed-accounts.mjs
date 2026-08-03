import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Provisions the run's two fixtures through the service layer, not over HTTP.
 *
 * Registering through the API instead would hit `AUTH_THROTTLE` — 5 requests a
 * minute per IP on both `register` and `login`, and a CI run is one IP. Those
 * limits are policy rather than configuration (`throttle.constants.ts` says so
 * outright), so loosening them for tests would mean no longer testing what
 * ships. Going through the services sidesteps the throttle structurally, and
 * leaves the run's handful of real logins comfortably inside it.
 *
 * This is exactly what `seed.ts` already does for the demo account, and the data
 * it produces is "as valid as anything created through the real endpoints".
 */

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { onboarded, fresh, databaseUrl } = JSON.parse(process.argv[2]);

process.env.DATABASE_URL = databaseUrl;
// Not production: migrations run on boot below that threshold, which is how the
// e2e schema gets created without a separate step.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
// The stub parser is what keeps OPENAI_API_KEY out of this process entirely.
process.env.MEAL_PARSER = 'stub';

const dist = (path) => resolve(here, '../../backend/dist', path);

require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require(dist('app.module'));
const { seedDemoAccount } = require(dist('database/seed'));
const { AuthService } = require(dist('auth/auth.service'));
const { WeightsService } = require(dist('weights/weights.service'));

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

try {
  // Three weeks of weights and meals plus an active goal — the dashboard has
  // something to show, and the trend has enough points to move.
  const result = await seedDemoAccount(app, onboarded);
  if (!result.created) {
    throw new Error(`Fixture ${onboarded.email} already existed`);
  }

  // One entry older than the demo seed's three weeks. The dashboard's weight
  // change is `current − the weight at or before 30 days ago`, and it falls back
  // to a flat 0 when the journal does not reach that far — so with the demo seed
  // alone the stat reads "0 kg" forever and no scenario could tell a working
  // calculation from a broken one. Added after the seed so the goal, which is
  // created last from the *latest* entry, is unaffected.
  const olderThanThirtyDays = new Date();
  olderThanThirtyDays.setUTCDate(olderThanThirtyDays.getUTCDate() - 40);
  olderThanThirtyDays.setUTCHours(7, 15, 0, 0);
  await app.get(WeightsService).create(result.userId, {
    weightKg: 88,
    recordedAt: olderThanThirtyDays.toISOString(),
  });

  // The second fixture stops at registration: no profile, no weight, no goal.
  // That absence *is* the scenario — a signed-in user who has not onboarded.
  await app.get(AuthService).register({
    firstName: 'Fresh',
    lastName: 'Account',
    ...fresh,
  });

  console.log(
    `[e2e] seeded ${onboarded.email} (${result.weightCount} weights, ${result.mealCount} meals) and ${fresh.email}`,
  );
} finally {
  await app.close();
}
