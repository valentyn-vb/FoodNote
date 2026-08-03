import { expect, test as setup } from '@playwright/test';
import { accounts, storageStateFor, type Account } from '../support/accounts';

/**
 * Signs in once per fixture and saves the session, so the scenarios do not each
 * spend a login. That is not a speed optimisation: `AUTH_THROTTLE` allows five
 * login attempts a minute per IP, and a suite that logged in per spec would be
 * testing the rate limiter.
 *
 * It is also scenario 1's "log in and land on the dashboard", asserted here
 * rather than duplicated — every other spec starts from the state this produces.
 */
async function signIn(page: import('@playwright/test').Page, account: Account) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  // Exact: the field shares its label's prefix with the "Show password" toggle
  // sitting inside the same input group.
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

setup('sign in as an onboarded user', async ({ page }) => {
  await signIn(page, accounts.onboarded);

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: storageStateFor('onboarded') });
});

setup('sign in as a user who has not onboarded', async ({ page }) => {
  await signIn(page, accounts.fresh);

  // No goal, so the app sends them to build one. Asserting it here as well as in
  // the access spec is deliberate: if this redirect stops working the storage
  // state below is captured from the wrong place, and every spec using it fails
  // for a reason that has nothing to do with what it tests.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.context().storageState({ path: storageStateFor('fresh') });
});
