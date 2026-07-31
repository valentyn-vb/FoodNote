'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import {
  buildPlanOptions,
  PACE_OPTIONS,
  PlanOption,
  type Pace,
} from '@foodnote/shared';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DEFAULT_PLAN_PACE, type OnboardingFormValues } from './form-schema';
import { ManualPlanDialog } from './manual-plan-dialog';
import { PlanOptions } from './plan-options';

type PlanSelectionProps = {
  input: OnboardingFormValues;
  onBack?: () => void;
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
  onBack,
  onConfirm,
  submitting = false,
  submitError = null,
  fromDate,
  initialPace,
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
    <div className="mx-auto flex max-h-[85dvh] w-full max-w-md flex-col gap-1 bg-bg pt-2.5 pb-4.5">
      <div className="flex shrink-0 flex-col gap-1 px-5 pb-3.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mb-2 flex size-5.5 shrink-0 items-center justify-center"
          >
            <ChevronLeft size={18} className="text-text-soft" strokeWidth={2} />
          </button>
        )}
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Choose your plan
        </h1>
        <p className="font-sans text-label text-text-muted">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <PlanOptions
          options={options}
          value={selectedPace}
          onValueChange={setPickedPace}
        />

        <div className="pt-3.5">
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
        </div>
      </div>

      <Disclaimer className="shrink-0 px-5 pt-3.5" />

      <div className="flex shrink-0 flex-col gap-2.5 px-5 pt-3">
        {submitError && (
          <p role="alert" className="font-sans text-[12px] text-destructive">
            {submitError}
          </p>
        )}
        <Button
          type="button"
          onClick={() => selectedPace !== null && onConfirm(selectedPace)}
          disabled={selectedPace === null || submitting}
          className="h-12.5 w-full bg-primary text-title shadow-cta"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Confirm plan
        </Button>
      </div>
    </div>
  );
}
