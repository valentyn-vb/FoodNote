'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  buildPlanOptions,
  PlanOption,
  type Pace,
  type PlanInput,
} from '@foodnote/shared';
import { useMemo, useState } from 'react';
import { DEFAULT_PLAN_PACE } from './form-schema';
import { PlanOptions } from './plan-options';

// The options, the disclaimer and the confirm button only: the heading, any
// back affordance and the surrounding padding belong to the caller, because
// this renders both as an onboarding step and inside two dialogs.
type PlanSelectionProps = {
  input: PlanInput;
  onConfirm: (pace: Pace) => void | Promise<void>;
  /** True while onConfirm is in flight — disables the button and shows a spinner. */
  submitting?: boolean;
  /** A retry-able error from onConfirm. */
  submitError?: string | null;
  /** Plan start date (defaults to today); injectable for tests. */
  fromDate?: string;
  /** Pre-selected pace (e.g. the user's current plan when re-choosing); falls back to the default. */
  initialPace?: Pace | null;
};

// The pace pre-selected when it's among the offered options, else the first one.
export function defaultPlanPace(options: PlanOption[]): Pace | null {
  if (options.length === 0) return null;
  return options.some((option) => option.pace === DEFAULT_PLAN_PACE)
    ? DEFAULT_PLAN_PACE
    : options[0].pace;
}

export function PlanSelection({
  input,
  onConfirm,
  submitting = false,
  submitError = null,
  fromDate,
  initialPace,
}: PlanSelectionProps) {
  const [pickedPace, setPickedPace] = useState<Pace | null>(null);

  const effectiveFromDate = fromDate ?? new Date().toISOString().slice(0, 10);

  const options = useMemo(
    () => buildPlanOptions({ ...input, fromDate: effectiveFromDate }),
    [input, effectiveFromDate],
  );

  const selectedPace = pickedPace ?? initialPace ?? defaultPlanPace(options);

  return (
    // A container, so the option grid answers to the width it was given —
    // one column in the onboarding column, two in the wide Change-plan dialog.
    <div className="@container flex flex-col gap-3.5">
      <PlanOptions
        options={options}
        value={selectedPace}
        onValueChange={setPickedPace}
      />

      <Disclaimer />

      <div className="flex flex-col gap-2.5">
        {submitError && (
          <p role="alert" className="text-sm text-destructive-text">
            {submitError}
          </p>
        )}
        <Button
          type="button"
          onClick={() => selectedPace !== null && onConfirm(selectedPace)}
          disabled={selectedPace === null || submitting}
          size="lg"
          className="w-full"
        >
          {submitting && <Spinner />}
          Confirm plan
        </Button>
      </div>
    </div>
  );
}
