'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { buildPlanOptions, PlanOption, type Pace } from '@foodnote/shared';
import { ChevronLeft } from 'lucide-react';
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 px-5 pb-3.5">
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back"
            className="mb-2 -ml-2"
          >
            <ChevronLeft />
          </Button>
        )}
        <Text variant="heading" render={<h1 />}>
          Choose your plan
        </Text>
        <Text variant="label" tone="muted" render={<p />}>
          Based on your goal, here are a few daily-calorie options.
        </Text>
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
          <Text variant="caption" tone="danger" render={<p role="alert" />}>
            {submitError}
          </Text>
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
