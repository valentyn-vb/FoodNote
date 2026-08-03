import { expect, test } from '@playwright/test';
import { storageStateFor } from '../support/accounts';

/**
 * Scenarios 4 and 5 — the two the migration is most likely to break, because
 * both are about a mutation agreeing with every view of the same data.
 *
 * Scenario 4 is #75's failure mode: re-dating an entry out of the visible window
 * leaves a phantom row behind, because the provider patches its own 60-day array
 * in place instead of re-reading.
 *
 * The assertion is deliberately made *after a reload*, not immediately. The bug
 * is still present on this implementation, and a net that has to be green today
 * cannot assert its absence. What is true on both sides of the migration is that
 * the re-dating persisted — and once the dashboard re-renders from the server,
 * the reload can be dropped and this becomes the assertion #79 promises.
 */

test.use({ storageState: storageStateFor('onboarded') });

const openHistory = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Edit weight history' }).first().click();

test('re-dating an entry outside the window removes it from the list', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await openHistory(page);

  const rows = page.getByRole('button', { name: 'Delete entry' });
  const before = await rows.count();

  // Edit the newest entry and push it far enough back that it leaves the
  // dashboard's six-week window entirely.
  await page.getByRole('button', { name: 'Edit entry' }).first().click();
  await page.getByLabel('Date and time').fill('2024-01-05T07:15');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.reload();
  await openHistory(page);
  await expect(rows).toHaveCount(before - 1);
});

test('a deleted entry stays deleted after a reload', async ({ page }) => {
  await page.goto('/dashboard');
  await openHistory(page);

  const rows = page.getByRole('button', { name: 'Delete entry' });
  const before = await rows.count();

  await rows.first().click();
  await expect(rows).toHaveCount(before - 1);

  await page.reload();
  await openHistory(page);
  await expect(rows).toHaveCount(before - 1);
});
