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

/** `refresh()` rather than `revalidatePath()`, for the reason spelled out at the
    top of `meals.ts`. */

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
