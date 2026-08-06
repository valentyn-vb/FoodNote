'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import {
  createPlanRequestSchema,
  goalResponseSchema,
  type CreatePlanRequest,
} from '@foodnote/shared';
import { ApiError } from '@/lib/api-error';
import { serverFetch } from '@/lib/server/fetch';
import { fail, type ActionResult } from './result';

/**
 * Onboarding's one write: the profile, the first weight entry and the goal, in a
 * single transaction Nest owns (`POST /plan`, docs/adr/0016). The wizard used to
 * make the three calls in a fixed order from the browser, and a failure halfway
 * left an account with a profile and no plan.
 *
 * On success it never returns: `redirect` throws, which is why it sits outside the
 * `try` — inside, the `NEXT_REDIRECT` it throws would be caught and reported as a
 * failed save.
 */
export async function createPlan(
  input: CreatePlanRequest,
): Promise<ActionResult> {
  const parsed = createPlanRequestSchema.safeParse(input);
  if (!parsed.success) return fail('Check your details');

  try {
    await serverFetch('/plan', goalResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    // `serverFetch` redirects to /login on a 401, and a redirect *is* a thrown
    // error — without this, an expired session would be reported as a failed save
    // and the user would sit on a form that can never succeed.
    unstable_rethrow(err);
    // Already onboarded — the tab was open while the plan was committed
    // elsewhere. The dashboard is where that user belongs, so this is not an
    // error to report.
    if (err instanceof ApiError && err.status === 409) redirect('/dashboard');
    return fail("Couldn't save your plan. Please try again.");
  }

  // No `refresh()`: nothing of this tree survives the navigation, and the
  // dashboard is a fresh server render either way.
  redirect('/dashboard');
}
