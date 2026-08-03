import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/**
 * Everything that has to be true before Playwright starts anything.
 *
 * Runs as `pretest:e2e`, so `npm run test:e2e -w e2e` works from a clean clone
 * with no remembered steps. Ordered, and the order is the point: the database
 * has to exist before Nest can boot against it, Nest has to be compiled before
 * the seeder can import it, and the accounts have to exist before the first
 * test tries to log in.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://foodnote:foodnote@localhost:5432/foodnote_e2e';

/**
 * A separate database in the same container, so a run physically cannot reach
 * the developer's own `foodnote` data and can be dropped whole. In CI the
 * service container is created with this database already, and this is a no-op.
 */
async function ensureDatabase() {
  const url = new URL(DATABASE_URL);
  const database = url.pathname.slice(1);

  // Connect to the maintenance database: you cannot CREATE DATABASE from
  // inside the database you are creating.
  url.pathname = '/postgres';
  const client = new pg.Client({ connectionString: url.toString() });

  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (rowCount === 0) {
      // No parameter binding for identifiers; the name comes from our own URL,
      // not from user input, and is quoted.
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`[e2e] created database ${database}`);
    }
  } finally {
    await client.end();
  }
}

function run(command, args) {
  execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' });
}

/**
 * The seeder imports Nest's compiled output rather than its sources: Playwright
 * transpiles TypeScript with esbuild, which does not emit the decorator metadata
 * Nest's dependency injection reads. Compiled by `tsc`, it is already there.
 */
function buildBackend() {
  run('npm', ['run', 'build', '-w', 'shared']);
  run('npm', ['run', 'build', '-w', 'backend']);
}

function seedAccounts() {
  // A fresh identity per run means no reset step and no cleanup: every entity in
  // FoodNote is scoped to a user, so a new email is already a clean universe.
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const accounts = {
    runId,
    onboarded: {
      email: `e2e-onboarded-${runId}@foodnote.test`,
      password: 'FoodNoteE2E!2026',
    },
    fresh: {
      email: `e2e-fresh-${runId}@foodnote.test`,
      password: 'FoodNoteE2E!2026',
    },
  };

  mkdirSync(resolve(here, '../.auth'), { recursive: true });
  writeFileSync(
    resolve(here, '../.auth/accounts.json'),
    `${JSON.stringify(accounts, null, 2)}\n`,
  );

  run('node', [
    resolve(here, 'seed-accounts.mjs'),
    JSON.stringify({ ...accounts, databaseUrl: DATABASE_URL }),
  ]);
}

await ensureDatabase();
buildBackend();
seedAccounts();
