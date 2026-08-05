'use server';

import { refresh } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import {
  createGoalRequestSchema,
  goalResponseSchema,
  paceSchema,
  profileResponseSchema,
  updateGoalRequestSchema,
  type CreateGoalRequest,
  type GoalResponse,
  type Pace,
  type UpdateGoalRequest,
} from '@foodnote/shared';
import { serverFetch } from '@/lib/server/fetch';
import { fail, failForm, fieldErrorsOf, ok, type ActionResult } from './result';

/** `refresh()` rather than `revalidatePath()`, for the reason spelled out at the
    top of `meals.ts`. */

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
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't save your plan. Please try again.");
  }
}

/**
 * The pace, from `/profile` — and the calorie target it produced, which is why
 * this is not `updateGoal`. The number lives on the profile, recomputed on read,
 * so the toast that reports it needs a second call; making that call here costs
 * the browser one round trip instead of two, and removes the client's only reason
 * to hold a profile.
 */
export async function changePlanPace(
  pace: Pace,
): Promise<ActionResult<{ calorieTarget: number | null }>> {
  const parsed = paceSchema.safeParse(pace);
  if (!parsed.success) return fail('Pick a pace');

  try {
    await serverFetch('/goals/current', goalResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify({ preferredWeeklyChangeKg: parsed.data }),
    });
    // Read past `getProfile`'s memo deliberately: this has to be the profile as
    // it is *after* the write above.
    const updated = await serverFetch('/profile', profileResponseSchema);

    refresh();
    return ok({ calorieTarget: updated.calorieTarget });
  } catch (err) {
    unstable_rethrow(err);
    return fail("Couldn't update your plan. Please try again.");
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
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't set your new target. Please try again.");
  }
}
