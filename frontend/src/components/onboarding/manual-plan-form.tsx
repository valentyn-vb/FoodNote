'use client';

import { FigureField } from '@/components/form-fields';
import { formatGoalDate, formatPace } from '@/lib/utils';
import {
  caloriesSchema,
  manualCalorieRange,
  paceForCalorieTarget,
  projectedDate,
} from '@foodnote/shared';
import type { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import type { OnboardingFormValues } from './form-schema';

/**
 * The manual plan: the user names their daily calories and the Pace — and so the
 * Projected Goal Date — is derived from them (see docs/adr/0009). Nothing new is
 * stored; the derived rate goes into the Goal's preferredWeeklyChangeKg like any
 * preset would, which is why this needs no API of its own.
 *
 * Bounds come from the shared calc rather than from this component: a manual plan
 * must not name calories the Safety Floor or the pace ceiling would silently
 * overrule, so the form refuses exactly what the read path would clamp.
 */
export function manualPlanFormSchema(range: { min: number; max: number }) {
  const message = `Choose between ${range.min.toLocaleString()} and ${range.max.toLocaleString()} kcal / day.`;
  return z.object({
    dailyCalories: caloriesSchema
      .int()
      .min(range.min, message)
      .max(range.max, message),
  });
}

export type ManualPlanFormValues = z.infer<
  ReturnType<typeof manualPlanFormSchema>
>;

export const MANUAL_PLAN_FORM_ID = 'manual-plan-form';

type ManualPlanFormProps = {
  form: UseFormReturn<ManualPlanFormValues>;
  onSubmit: (values: ManualPlanFormValues) => void;
  /** Body data and goal weights — what the derived rate is computed against. */
  input: OnboardingFormValues;
  /** Plan start date, for the projected goal date. */
  fromDate: string;
};

export function ManualPlanForm({
  form,
  onSubmit,
  input,
  fromDate,
}: ManualPlanFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const range = manualCalorieRange(input);
  const dailyCalories = watch('dailyCalories');

  // Only preview inside the range the schema accepts: outside it the derived rate
  // would be a clamped fiction sitting next to a field error.
  const inRange =
    Number.isFinite(dailyCalories) &&
    dailyCalories >= range.min &&
    dailyCalories <= range.max;
  const pace = inRange ? paceForCalorieTarget(input, dailyCalories) : null;
  const goalDate =
    pace !== null && pace > 0
      ? projectedDate(
          Math.abs(input.targetWeightKg - input.currentWeightKg),
          pace,
          fromDate,
        )
      : null;

  // Pace 0 means these calories won't move the user toward their target — a
  // maintenance plan, which has no goal date to show (ADR-0006).
  const derived =
    pace === null
      ? `Anything from ${range.min.toLocaleString()} to ${range.max.toLocaleString()} kcal.`
      : pace === 0
        ? 'Holds your current weight — no goal date.'
        : `${formatPace(pace)} kg / week · goal date ~ ${formatGoalDate(goalDate)}`;

  return (
    <form
      id={MANUAL_PLAN_FORM_ID}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex"
    >
      <FigureField
        id="dailyCalories"
        label="Daily calories"
        unit="kcal"
        type="number"
        inputMode="numeric"
        autoFocus
        placeholder={`e.g. ${range.max.toLocaleString()}`}
        description={derived}
        error={errors.dailyCalories?.message}
        {...register('dailyCalories', { valueAsNumber: true })}
      />
    </form>
  );
}
