'use server';

import { unstable_rethrow } from 'next/navigation';
import {
  createSavedMealRequestSchema,
  listSavedMealsResponseSchema,
  savedMealResponseSchema,
  updateSavedMealRequestSchema,
  type CreateSavedMealRequest,
  type ListSavedMealsResponse,
  type SavedMealResponse,
  type UpdateSavedMealRequest,
} from '@foodnote/shared';
import { serverFetch, serverSend } from '@/lib/server/fetch';
import { fail, failForm, fieldErrorsOf, ok, type ActionResult } from './result';

/**
 * Saved Meals — meals kept by name to log again. Logging one goes through
 * `saveMeal` in `./meals`, not through here: the two records are copies, never
 * linked (ADR-0014), so nothing in this module ever writes a Meal Entry.
 *
 * No `refresh()` in any of them, unlike the meal actions. A Saved Meal is drawn
 * only inside the drawer's picker, which holds the list itself and answers a tap
 * from its own state; refreshing the route would re-render a dashboard that
 * cannot have changed.
 *
 * `list` is an action rather than a read in the page that shows it, because the
 * picker is behind the drawer: the list is worth nothing until it opens, and the
 * drawer is mounted by the shell on every route. It is still a server read —
 * `serverFetch` remains the only door to Nest, so the session check holds.
 */

export async function listSavedMeals(): Promise<
  ActionResult<ListSavedMealsResponse>
> {
  try {
    return ok(await serverFetch('/saved-meals', listSavedMealsResponseSchema));
  } catch (err) {
    unstable_rethrow(err);
    return fail("Couldn't load your saved meals.");
  }
}

/** The draft as shown, minus the occasion — a template has no mealType or day. */
export async function createSavedMeal(
  input: CreateSavedMealRequest,
): Promise<ActionResult<SavedMealResponse>> {
  const parsed = createSavedMealRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the meal', fieldErrorsOf(parsed.error));
  }

  try {
    const saved = await serverFetch('/saved-meals', savedMealResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    return ok(saved);
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't keep that meal. Please try again.");
  }
}

/**
 * The only way a template's figures ever change. Meals already logged from it
 * are untouched, so a correction applies to loggings from here on (ADR-0014).
 */
export async function updateSavedMeal(
  id: string,
  input: UpdateSavedMealRequest,
): Promise<ActionResult<SavedMealResponse>> {
  const parsed = updateSavedMealRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the meal', fieldErrorsOf(parsed.error));
  }

  try {
    const saved = await serverFetch(
      `/saved-meals/${id}`,
      savedMealResponseSchema,
      { method: 'PATCH', body: JSON.stringify(parsed.data) },
    );
    return ok(saved);
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't save your changes. Please try again.");
  }
}

/**
 * Drops a template. Meals logged from it are untouched. `failure` is the
 * caller's, as `deleteMeal`'s is: the row's trash says "couldn't remove", the
 * toast's Undo says "couldn't undo".
 */
export async function deleteSavedMeal(
  id: string,
  failure: string,
): Promise<ActionResult> {
  try {
    await serverSend(`/saved-meals/${id}`, { method: 'DELETE' });
    return ok();
  } catch (err) {
    unstable_rethrow(err);
    return failForm(failure);
  }
}
