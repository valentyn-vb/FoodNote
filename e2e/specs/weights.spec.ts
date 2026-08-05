import { expect, test } from '@playwright/test';
import { storageStateFor } from '../support/accounts';

/**
 * Scenarios 4 and 5 — the two the migration is most likely to break, because
 * both are about a mutation agreeing with every view of the same data.
 *
 * Scenario 4 is #75's failure mode: re-dating an entry out of the visible window
 * leaves a phantom row behind, because the client patches its own array in place
 * instead of re-reading. It is asserted without a reload now, which is the
 * assertion #79 promised: the journal is a Server Component and the weight
 * actions `refresh()` the route that drew the row, so the list the reader is
 * looking at *is* the server's answer. The reload after it is a separate claim —
 * that the write persisted, not merely that the screen agreed.
 *
 * Both drive `/weights`, not the dashboard: the dashboard's history drawer is
 * gone, replaced by a "View full history" link to that page, so the journal has
 * one home and these are the rows a user can actually edit.
 */

test.use({ storageState: storageStateFor('onboarded') });

/** A UTC day, `offsetDays` from today — how `?from=` and `?to=` are spelled. */
const utcDay = (offsetDays = 0) => {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day.toISOString().slice(0, 10);
};

/**
 * A window wide enough to hold the whole fixture: three weeks of weigh-ins plus
 * the entry seeded 40 days back. The page's own default is 7 days, which would
 * show a handful of rows and — worse for scenario 4 — make "the entry left the
 * window" true of almost any date, including one the re-dating never reached.
 *
 * The bounds are in the URL rather than clicked through the range nav, so a test
 * about a mutation does not also depend on the control that moves the window.
 */
const journal = () => `/weights?from=${utcDay(-60)}&to=${utcDay()}`;

/**
 * The journal's rows, once there are some.
 *
 * `count()` does not wait, and the list arrives with the server render rather
 * than with the navigation — counted straight after `goto` it reads 0, and every
 * assertion below is against `before - 1`, so a premature count fails as
 * "expected -1".
 */
async function rowsOf(page: import('@playwright/test').Page) {
  const rows = page.getByRole('button', { name: 'Delete entry' });
  await expect(rows.first()).toBeVisible();
  return rows;
}

test('re-dating an entry outside the window removes it from the list', async ({
  page,
}) => {
  await page.goto(journal());

  const rows = await rowsOf(page);
  const before = await rows.count();

  // Edit the newest entry and push it far enough back that it leaves the
  // selected window entirely.
  await page.getByRole('button', { name: 'Edit entry' }).first().click();
  await page.getByLabel('Date and time').fill('2024-01-05T07:15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(rows).toHaveCount(before - 1);

  await page.reload();
  await expect(rows).toHaveCount(before - 1);
});

test('a deleted entry stays deleted after a reload', async ({ page }) => {
  await page.goto(journal());

  const rows = await rowsOf(page);
  const before = await rows.count();

  await rows.first().click();
  await expect(rows).toHaveCount(before - 1);

  await page.reload();
  await expect(rows).toHaveCount(before - 1);
});
