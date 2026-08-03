import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 3100;
const API_PORT = 3101;
const WEB_URL = `http://localhost:${WEB_PORT}`;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://foodnote:foodnote@localhost:5432/foodnote_e2e';

/**
 * Ports deliberately not 3000/3001: a run must not collide with, or silently
 * attach to, the dev server someone already has open.
 *
 * The frontend runs as a production build because that is what ships —
 * streaming, `loading.tsx` and caching behave differently under `next dev`, and
 * on-demand route compilation is the most reliable source of timeout flake.
 *
 * The backend must *not* run as production: `migrationsRun` is switched off
 * there, so the schema would never be created, and the refresh cookie becomes
 * `secure`, which a browser refuses over plain http. Both failures look like
 * "login is broken" rather than like a misconfiguration.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      // Already built by `pretest:e2e`; this only starts it.
      command: 'node ../backend/dist/main',
      port: API_PORT,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        DATABASE_URL,
        MEAL_PARSER: 'stub',
        JWT_ACCESS_SECRET: 'e2e-access-secret',
        JWT_REFRESH_SECRET: 'e2e-refresh-secret',
      },
    },
    {
      command: `npm run build -w frontend --prefix .. && npm run start -w frontend --prefix .. -- --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 180_000,
      env: {
        API_URL: `http://localhost:${API_PORT}`,
      },
    },
  ],
});
