'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { buildPlanOptions, PlanOption, type Pace } from '@foodnote/shared';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DEFAULT_PLAN_PACE, type OnboardingFormValues } from './form-schema';
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

  const options = useMemo(
    () => buildPlanOptions({ ...input, fromDate: effectiveFromDate }),
    [input, effectiveFromDate],
  );

  const selectedPace = pickedPace ?? initialPace ?? defaultPlanPace(options);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 bg-bg pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 px-5 pb-3.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mb-2 flex size-5.5 shrink-0 items-center justify-center"
          >
            <ChevronLeft size={18} className="text-[#333333]" strokeWidth={2} />
          </button>
        )}
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Choose your plan
        </h1>
        <p className="font-sans text-label text-text-muted">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      <div className="px-5">
        <PlanOptions
          options={options}
          value={selectedPace}
          onValueChange={setPickedPace}
        />
      </div>

      <Disclaimer className="px-5 pt-3.5" />

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        {submitError && (
          <p role="alert" className="font-sans text-[12px] text-destructive">
            {submitError}
          </p>
        )}
        <Button
          type="button"
          onClick={() => selectedPace !== null && onConfirm(selectedPace)}
          disabled={selectedPace === null || submitting}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Confirm plan
        </Button>
      </div>
    </div>
  );
}
