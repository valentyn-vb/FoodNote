'use server';

import { refresh } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import {
  createWeightRequestSchema,
  updateWeightRequestSchema,
  weightEntryResponseSchema,
  type CreateWeightRequest,
  type UpdateWeightRequest,
  type WeightEntryResponse,
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

export async function saveWeight(
  input: CreateWeightRequest,
): Promise<ActionResult<WeightEntryResponse>> {
  const parsed = createWeightRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the weight', fieldErrorsOf(parsed.error));
  }

  try {
    const entry = await serverFetch('/weights', weightEntryResponseSchema, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    return ok(entry);
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't save your weight. Please try again.");
  }
}

export async function updateWeight(
  id: string,
  input: UpdateWeightRequest,
): Promise<ActionResult<WeightEntryResponse>> {
  const parsed = updateWeightRequestSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Check the entry', fieldErrorsOf(parsed.error));
  }

  try {
    const entry = await serverFetch(
      `/weights/${id}`,
      weightEntryResponseSchema,
      { method: 'PATCH', body: JSON.stringify(parsed.data) },
    );
    refresh();
    return ok(entry);
  } catch (err) {
    unstable_rethrow(err);
    return failForm("Couldn't save your changes. Please try again.");
  }
}

/**
 * Nest refuses to delete the last remaining entry (#36) — a plan with no weight
 * in it has no start. That arrives here as an ordinary failed response, which is
 * why the message is the caller's: the drawer says it beside the row.
 */
export async function deleteWeight(
  id: string,
  failure: string,
): Promise<ActionResult> {
  try {
    await serverSend(`/weights/${id}`, { method: 'DELETE' });
    refresh();
    return ok();
  } catch (err) {
    unstable_rethrow(err);
    return failForm(failure);
  }
}
