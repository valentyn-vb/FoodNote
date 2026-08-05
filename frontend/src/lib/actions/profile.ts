'use server';

import { refresh } from 'next/cache';
import {
  appearanceSchema,
  authUserSchema,
  goalResponseSchema,
  profileResponseSchema,
  putProfileRequestSchema,
  updateAccountRequestSchema,
  weightEntryResponseSchema,
  type Appearance,
  type UpdateAccountRequest,
} from '@foodnote/shared';
import {
  DEFAULT_PLAN_PACE,
  onboardingFormSchema,
  type OnboardingFormValues,
} from '@/components/onboarding/form-schema';
import { serverFetch } from '@/lib/server/fetch';
import { getProfile } from '@/lib/server/reads';
import { fail, ok, type ActionResult } from './result';

/**
 * The writes behind `/profile`. `refresh()` rather than `revalidatePath()` for the
 * reason spelled out at the top of `meals.ts`: nothing here is cached, so there is
 * nothing to invalidate — what is needed is a re-render of the tree from source.
 *
 * Every failure below reaches the user as a toast: the two dialogs have already
 * closed by the time the write is attempted, so there is no field left to draw an
 * error under.
 */

/**
 * The details form saves up to three things, and it is the ordering that makes
 * this an action rather than three. A new weight has to exist before the target is
 * replaced, and both before the profile is written, because the profile
 * response recomputes the calorie target from whatever weight and goal it finds:
 * run these in any other order and the number the toast reports predates the
 * change.
 *
 * What changed is decided here, against the stored profile, rather than taken from
 * the client's copy of it — the browser's copy can be a minute old, and a stale
 * "unchanged" silently drops a weigh-in.
 */
export async function saveDetails(
  input: OnboardingFormValues,
): Promise<ActionResult<{ calorieTarget: number | null; replan: boolean }>> {
  const parsed = onboardingFormSchema.safeParse(input);
  if (!parsed.success) return fail('Check your details');

  const values = parsed.data;

  try {
    const previous = await getProfile();
    const weightChanged = values.currentWeightKg !== previous?.currentWeightKg;
    const targetChanged = values.targetWeightKg !== previous?.targetWeightKg;

    if (weightChanged) {
      await serverFetch('/weights', weightEntryResponseSchema, {
        method: 'POST',
        body: JSON.stringify({
          weightKg: values.currentWeightKg,
          recordedAt: new Date().toISOString(),
        }),
      });
    }

    if (targetChanged) {
      await serverFetch('/goals', goalResponseSchema, {
        method: 'POST',
        body: JSON.stringify({
          targetWeightKg: values.targetWeightKg,
          // A pace is not collected on this form, so replacing the target keeps
          // the one already chosen — and a profile with no goal yet has none.
          preferredWeeklyChangeKg:
            previous?.preferredWeeklyChangeKg ?? DEFAULT_PLAN_PACE,
        }),
      });
    }

    const updated = await serverFetch('/profile', profileResponseSchema, {
      method: 'PUT',
      body: JSON.stringify(putProfileRequestSchema.parse(values)),
    });

    refresh();
    return ok({
      calorieTarget: updated.calorieTarget,
      // A recomputed target says nothing about whether the *pace* behind it still
      // fits, and only the user can judge that — so the caller says so.
      replan: weightChanged || targetChanged,
    });
  } catch {
    return fail("Couldn't save your details. Please try again.");
  }
}

/**
 * The name, which is rendered from a server read in three places — this page, the
 * sidebar and the header. All three sit above the page, so the refresh has to
 * reach the layout: it does, because `refresh()` re-renders the whole current
 * tree rather than a path someone remembered to name.
 */
export async function updateAccount(
  input: UpdateAccountRequest,
): Promise<ActionResult> {
  const parsed = updateAccountRequestSchema.safeParse(input);
  if (!parsed.success) return fail('Check the form');

  try {
    await serverFetch('/auth/me', authUserSchema, {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
    refresh();
    return ok();
  } catch {
    return fail("Couldn't save your profile. Please try again.");
  }
}

/**
 * The appearance, and the one write here that does **not** refresh: the feedback
 * is the page repainting, which the client has already done optimistically, and a
 * re-render would only re-fetch the data behind a colour switch. The cookie stays
 * the browser's to write — see `appearance-provider`.
 */
export async function saveAppearance(next: Appearance): Promise<ActionResult> {
  const parsed = appearanceSchema.safeParse(next);
  if (!parsed.success) return fail('Unknown appearance');

  try {
    await serverFetch('/profile', profileResponseSchema, {
      method: 'PATCH',
      body: JSON.stringify({ appearance: parsed.data }),
    });
    return ok();
  } catch {
    return fail("Couldn't save your appearance.");
  }
}
