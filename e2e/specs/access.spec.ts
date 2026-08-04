import { expect, test } from '@playwright/test';
import { storageStateFor } from '../support/accounts';

/**
 * Scenarios 6 and 7. Both are about where the app sends someone who asks for a
 * page they cannot have — the behaviour the migration moves from a client-side
 * spinner-then-`router.replace` to a server redirect. Phrased as a destination,
 * it does not care which of the two is doing the work.
 */

test.describe('without a session', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('asking for the dashboard lands on the login page', async ({ page }) => {
    await page.goto('/dashboard');

    // The destination rides along, so signing in returns you to the page you
    // asked for rather than to the dashboard by default. This is not a rare
    // path: the refresh cookie lasts seven days, so an active user meets it
    // weekly, and any bookmarked page opened while signed out meets it too.
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });
});

test.describe('signed in but not onboarded', () => {
  test.use({ storageState: storageStateFor('fresh') });

  test('asking for the dashboard lands on onboarding', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/onboarding$/);
  });
});
