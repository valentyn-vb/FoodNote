'use server';

import { refresh } from 'next/cache';
import {
  createMealRequestSchema,
  mealResponseSchema,
  updateMealRequestSchema,
  type CreateMealRequest,
  type MealResponse,
  type UpdateMealRequest,
} from '@foodnote/shared';
import { serverFetch, serverSend } from '@/lib/server/fetch';
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

export async function saveMeal(
  input: CreateMealRequest,
): Promise<ActionResult<MealResponse>> {
  const parsed = createMealRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the meal', fieldErrorsOf(parsed.error));
  }

  try {
    const meal = await serverFetch('/meals', mealResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    // The saved meal comes back because the caller offers Undo, which needs its
    // id — the toast is drawn on the client and outlives this action.
    return ok(meal);
  } catch {
    return failForm("Couldn't save your meal. Please try again.");
  }
}

export async function updateMeal(
  id: string,
  input: UpdateMealRequest,
): Promise<ActionResult<MealResponse>> {
  const parsed = updateMealRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the meal', fieldErrorsOf(parsed.error));
  }

  try {
    const meal = await serverFetch(`/meals/${id}`, mealResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    return ok(meal);
  } catch {
    return failForm("Couldn't save your changes. Please try again.");
  }
}

/**
 * `failure` is the caller's, because the two entry points are different news:
 * a meal line's trash control says "couldn't delete", and the save toast's Undo
 * says "couldn't undo".
 */
export async function deleteMeal(
  id: string,
  failure: string,
): Promise<ActionResult> {
  try {
    await serverSend(`/meals/${id}`, { method: 'DELETE' });
    refresh();
    return ok();
  } catch {
    return failForm(failure);
  }
}
