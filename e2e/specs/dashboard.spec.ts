import { expect, test } from '@playwright/test';
import { storageStateFor } from '../support/accounts';

/**
 * Scenarios 1 and 3.
 *
 * The stats are matched by the accessible name the tile now carries —
 * `"<label>: <value><suffix>"` — rather than by the per-digit spans NumberFlow
 * renders. A regex on the label keeps the assertion independent of formatting
 * (grouping separators, the suffix), which is not what these scenarios are about.
 */

test.use({ storageState: storageStateFor('onboarded') });

const stat = (label: string) => new RegExp(`^${label}: `);

test('the dashboard shows today’s numbers', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText(stat('Remaining today'))).toBeVisible();
  await expect(page.getByText(stat('Eaten today'))).toBeVisible();
  await expect(page.getByText(stat('Weight change'))).toBeVisible();
});

test('logging a weight moves the change stat', async ({ page }) => {
  await page.goto('/dashboard');

  const changeStat = page.getByText(stat('Weight change'));
  const before = await changeStat.textContent();

  await page.getByRole('button', { name: 'Log weight' }).first().click();
  // A step large enough that no rounding or jitter in the seeded journal could
  // produce the same figure by accident.
  await page.getByLabel('Weight (kg)').fill('74.2');
  await page.getByRole('button', { name: 'Save weight' }).click();

  await expect(changeStat).not.toHaveText(before ?? '');
});
