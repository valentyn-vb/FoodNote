'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  buildPlanOptions,
  PACE_OPTIONS,
  PlanOption,
  type Pace,
  type PlanInput,
} from '@foodnote/shared';
import { useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_PLAN_PACE } from './form-schema';
import { ManualPlanDialog } from './manual-plan-dialog';
import { PlanOptions } from './plan-options';
import { cn } from '@/lib/utils';

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
  /**
   * Sits beside Confirm plan — onboarding's Back. The confirm button stays here
   * rather than moving out to each caller, because the spinner and the error
   * under it are this component's state.
   */
  secondaryAction?: ReactNode;
  /**
   * Overrides the confirm button's copy. Onboarding's step 2 does not confirm
   * anything — it moves to the review step, where the only write in the flow
   * is — so it must not offer a button that says it does.
   */
  confirmLabel?: string;
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
  secondaryAction,
  confirmLabel = 'Confirm plan',
}: PlanSelectionProps) {
  const [pickedPace, setPickedPace] = useState<Pace | null>(null);

  const effectiveFromDate = fromDate ?? new Date().toISOString().slice(0, 10);

  // The user's own plan is one of the options, so a manual rate gets a card like
  // any preset and arrives already selected. That is what keeps this component
  // free of special cases: no substitute pace, no second "start from" rate.
  const options = useMemo(
    () =>
      buildPlanOptions({
        ...input,
        fromDate: effectiveFromDate,
        currentPace: initialPace ?? undefined,
      }),
    [input, effectiveFromDate, initialPace],
  );

  const selectedPace = pickedPace ?? initialPace ?? defaultPlanPace(options);

  // Only decides the manual dialog's wording — an existing manual plan is edited,
  // not created.
  const isCustomPlan =
    initialPace != null && !PACE_OPTIONS.includes(initialPace);

  // Where "remove my custom plan" lands. Chosen from the presets only, so the
  // fallback can never be the custom rate we are trying to drop — which is what
  // it would be for a body whose maintenance sits under the safety floor, since
  // then even the maintenance preset is hidden and the custom card is options[0].
  // Null there means no preset is viable, so the dialog omits the button rather
  // than offering one that does nothing.
  const presetFallbackPace = defaultPlanPace(
    options.filter((option) => PACE_OPTIONS.includes(option.pace)),
  );

  return (
    // A container, so the option grid answers to the width it was given —
    // one column in the onboarding column, two in the wide Change-plan dialog.
    <div className="@container flex flex-col gap-4">
      <PlanOptions
        options={options}
        value={selectedPace}
        onValueChange={setPickedPace}
      />

      <ManualPlanDialog
        input={input}
        fromDate={effectiveFromDate}
        startFromPace={selectedPace}
        isCustomPlan={isCustomPlan}
        onConfirm={onConfirm}
        onRemove={
          isCustomPlan && presetFallbackPace !== null
            ? () => void onConfirm(presetFallbackPace)
            : undefined
        }
      />

      <Disclaimer />

      <div className="flex flex-col gap-2.5">
        {submitError && (
          <p role="alert" className="text-sm text-destructive-text">
            {submitError}
          </p>
        )}
        {/* With a second action the two take opposite ends of the row; alone,
            the confirm button still spans it. */}
        <div className="flex justify-between gap-2.5">
          {secondaryAction}
          <Button
            type="button"
            onClick={() => selectedPace !== null && onConfirm(selectedPace)}
            disabled={selectedPace === null || submitting}
            size="lg"
            className={cn(secondaryAction ? 'px-6' : 'grow')}
          >
            {submitting && <Spinner />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
