'use client';

import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatGoalDate } from '@/lib/utils';
import { buildPlanOptions, type Pace } from '@foodnote/shared';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DEFAULT_PLAN_PACE, type OnboardingFormValues } from './form-schema';

type PlanSelectionProps = {
  input: OnboardingFormValues;
  onBack: () => void;
  onConfirm: (pace: Pace) => void | Promise<void>;
  /** True while onConfirm is in flight — disables the button and shows a spinner. */
  submitting?: boolean;
  /** A retry-able error from onConfirm. */
  submitError?: string | null;
  /** Plan start date (defaults to today); injectable for tests. */
  fromDate?: string;
};

export function PlanSelection({
  input,
  onBack,
  onConfirm,
  submitting = false,
  submitError = null,
  fromDate,
}: PlanSelectionProps) {
  const [pickedPace, setPickedPace] = useState<Pace | null>(null);

  const effectiveFromDate = fromDate ?? new Date().toISOString().slice(0, 10);

  const options = useMemo(
    () => buildPlanOptions({ ...input, fromDate: effectiveFromDate }),
    [input, effectiveFromDate],
  );

  const defaultPace = useMemo<Pace | null>(() => {
    if (options.length === 0) return null;
    return options.some((option) => option.pace === DEFAULT_PLAN_PACE)
      ? DEFAULT_PLAN_PACE
      : options[0].pace;
  }, [options]);

  const selectedPace = pickedPace ?? defaultPace;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 bg-bg pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 px-5 pb-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="mb-2 flex size-5.5 shrink-0 items-center justify-center"
        >
          <ChevronLeft size={18} className="text-[#333333]" strokeWidth={2} />
        </button>
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Choose your plan
        </h1>
        <p className="font-sans text-label text-text-muted">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      {options.length === 0 ? (
        <p className="px-5 py-4 font-sans text-label text-text-muted">
          No safe plan reaches this target from your current weight. Try a
          smaller change.
        </p>
      ) : (
        <RadioGroup
          value={selectedPace !== null ? String(selectedPace) : ''}
          onValueChange={(value) => setPickedPace(Number(value) as Pace)}
          className="gap-3 px-5"
        >
          {options.map((option) => {
            const selected = option.pace === selectedPace;
            return (
              <label
                key={option.pace}
                className={cn(
                  'flex cursor-pointer flex-col gap-1.5 rounded-md px-4.5 py-4 transition-colors duration-150',
                  selected
                    ? 'border-2 border-primary bg-[#FFF9F3] shadow-[0_4px_14px_#f5a65c29]'
                    : 'border border-border bg-surface shadow-[0_1px_2px_#00000008]',
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'font-sans text-[12.5px] font-medium',
                      selected ? 'text-primary-deep' : 'text-text-muted',
                    )}
                  >
                    {option.pace} kg / week
                  </div>
                  <RadioGroupItem
                    value={String(option.pace)}
                    className="size-4.5 border-none bg-transparent data-checked:bg-primary"
                  />
                </div>
                <div className="font-display text-[25px] font-semibold text-text">
                  {option.dailyCalorieTarget.toLocaleString()} kcal / day
                </div>
                <div
                  className={cn(
                    'font-sans text-[12.5px]',
                    selected ? 'text-primary-deep' : 'text-text-muted',
                  )}
                >
                  Goal date ~ {formatGoalDate(option.projectedGoalDate)}
                </div>
              </label>
            );
          })}
        </RadioGroup>
      )}

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
