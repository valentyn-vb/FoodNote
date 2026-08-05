import { expect, test } from '@playwright/test';
import { storageStateFor } from '../support/accounts';

/**
 * Scenario 2, through the AI path — the drawer is AI-first, so the manual form
 * is the branch, not the journey. `MealParser` is swapped for a deterministic
 * stub in the backend process, so "Parse with AI" answers with fixed numbers and
 * no network call leaves the machine.
 */

test.use({ storageState: storageStateFor('onboarded') });

test('a parsed meal reaches the day’s list and the calorie total', async ({
  page,
}) => {
  await page.goto('/dashboard');

  const eaten = page.getByText(/^Eaten today: /);
  const before = await eaten.textContent();

  await page.getByRole('button', { name: 'Log a meal' }).first().click();
  await page
    .getByPlaceholder('Chicken breast 200 g, rice 150 g and a salad…')
    .fill('Two eggs and a slice of toast');
  await page.getByRole('button', { name: 'Parse with AI' }).click();

  await expect(page.getByText('Review your meal')).toBeVisible();
  await page.getByRole('button', { name: /^Save ·/ }).click();

  await expect(eaten).not.toHaveText(before ?? '');

  await page.goto('/meals');
  await expect(page.getByText('Stubbed parse')).toBeVisible();
});

test('the manual branch is still reachable', async ({ page }) => {
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Log a meal' }).first().click();
  await page.getByRole('button', { name: 'Enter manually instead' }).click();

  await expect(page.getByText('Enter a meal')).toBeVisible();
});
