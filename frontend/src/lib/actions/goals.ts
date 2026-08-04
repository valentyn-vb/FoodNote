'use server';

import { refresh } from 'next/cache';
import {
  createGoalRequestSchema,
  goalResponseSchema,
  updateGoalRequestSchema,
  type CreateGoalRequest,
  type GoalResponse,
  type UpdateGoalRequest,
} from '@foodnote/shared';
import { serverFetch } from '@/lib/server/fetch';
import { fail, failForm, fieldErrorsOf, ok, type ActionResult } from './result';

/**
 * Why `refresh()` and not `revalidatePath()`.
 *
 * `revalidatePath` invalidates *cached data*, and this app has none: every read
 * goes through `serverFetch`, which is `cache: 'no-store'` because every response
 * is per-user and cookie-dependent. So there is nothing for it to invalidate, and
 * it does not re-render on its own — the page kept its old figures after a
 * successful write until this was changed. `refresh()` refreshes the client
 * router from inside the action, which is the thing actually needed: re-render
 * the current tree from source.
 *
 * It also makes the per-path bookkeeping unnecessary. `refresh()` refreshes
 * whatever route the user is on, and every other route is dynamic and uncached,
 * so it renders fresh the moment it is navigated to. There is no such thing as a
 * stale page here to name in advance.
 */

export async function updateGoal(
  input: UpdateGoalRequest,
): Promise<ActionResult<GoalResponse>> {
  const parsed = updateGoalRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the plan', fieldErrorsOf(parsed.error));
  }

  try {
    const goal = await serverFetch('/goals/current', goalResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    return ok(goal);
  } catch {
    return failForm("Couldn't save your plan. Please try again.");
  }
}

/**
 * A new target. POST replaces the active goal rather than adding a second one
 * (ADR-0003), and the outgoing one is marked `completed` or `replaced` by
 * `goals.service` — the frontend never says which.
 */
export async function createGoal(
  input: CreateGoalRequest,
): Promise<ActionResult<GoalResponse>> {
  const parsed = createGoalRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the plan', fieldErrorsOf(parsed.error));
  }

  try {
    const goal = await serverFetch('/goals', goalResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    return ok(goal);
  } catch {
    return failForm("Couldn't set your new target. Please try again.");
  }
}
