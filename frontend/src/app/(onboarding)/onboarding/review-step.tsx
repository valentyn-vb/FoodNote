'use client';

import { DetailRow } from '@/components/detail-row';
import { Disclaimer } from '@/components/disclaimer';
import type { OnboardingFormValues } from '@/components/onboarding/form-schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ACTIVITY_LEVEL_LABELS, SEX_LABELS } from '@/lib/enum-labels';
import { formatGoalDate, formatPace } from '@/lib/utils';
import {
  calorieTargetForPace,
  projectedDate,
  type Pace,
} from '@foodnote/shared';
import { ChevronLeft } from 'lucide-react';

type ReviewStepProps = {
  values: OnboardingFormValues;
  pace: Pace;
  /** The plan's start date, fixed by the wizard so both steps derive one goal date. */
  fromDate: string;
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onConfirm: () => void;
};

/**
 * The last step: what was entered and what was chosen, as text, with the only
 * write in the flow behind its button.
 *
 * The plan is re-derived here from the Pace rather than carried down from the
 * picker, which hands up a Pace and nothing else — the two numbers below come
 * from the same `shared/` functions the plate and the manual-plan preview use,
 * so there is no second definition of what a plan is.
 */
export function ReviewStep({
  values,
  pace,
  fromDate,
  submitting,
  submitError,
  onBack,
  onConfirm,
}: ReviewStepProps) {
  const dailyCalorieTarget = calorieTargetForPace(values, pace);

  // Pace 0 is maintenance: "0 kg / week" reads as a broken value, and there is
  // no destination to date — `formatGoalDate(null)` would print "Target already
  // reached" on a plan just being started. Same two lines as the plate.
  const isMaintenance = pace === 0;
  const paceLine = isMaintenance
    ? 'Maintain your weight'
    : `${formatPace(pace)} kg / week`;
  const outcomeLine = isMaintenance
    ? 'Holds your current weight'
    : `Goal date ~ ${formatGoalDate(
        projectedDate(
          Math.abs(values.targetWeightKg - values.currentWeightKg),
          pace,
          fromDate,
        ),
      )}`;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2.5">
        <h2 className="px-2 text-sm text-muted-foreground">Your plan</h2>
        <Card className="gap-2 border-primary bg-accent px-4 py-4">
          <span className="text-sm">{paceLine}</span>
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {dailyCalorieTarget.toLocaleString()} kcal / day
          </span>
          <span className="text-sm text-muted-foreground">{outcomeLine}</span>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="px-2 text-sm text-muted-foreground">Your details</h2>
        <Card className="gap-0 overflow-hidden py-0">
          <dl className="divide-y divide-border">
            <DetailRow label="Sex" value={SEX_LABELS[values.sex]} />
            <DetailRow label="Age" value={values.age} />
            <DetailRow label="Height" value={`${values.heightCm} cm`} />
            <DetailRow
              label="Current weight"
              value={`${values.currentWeightKg} kg`}
            />
            <DetailRow
              label="Target weight"
              value={`${values.targetWeightKg} kg`}
            />
            <DetailRow
              label="Activity level"
              value={ACTIVITY_LEVEL_LABELS[values.activityLevel]}
              numeric={false}
            />
          </dl>
        </Card>
      </section>

      <div className="flex flex-col gap-2.5">
        <Disclaimer />
        {submitError && (
          <p role="alert" className="text-sm text-destructive-text">
            {submitError}
          </p>
        )}
        <div className="flex justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={submitting}
            className="px-6"
          >
            <ChevronLeft />
            Back
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onConfirm}
            disabled={submitting}
            className="px-6"
          >
            {submitting && <Spinner />}
            Proceed to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
