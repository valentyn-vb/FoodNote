'use client';

import { Disclaimer } from '@/components/disclaimer';
import {
  DETAILS_FORM_ID,
  DetailsForm,
} from '@/components/onboarding/details-form';
import {
  onboardingFormSchema,
  type OnboardingFormValues,
} from '@/components/onboarding/form-schema';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { Button } from '@/components/ui/button';
import { createPlan } from '@/lib/actions/plan';
import type { Pace } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type Step = 'details' | 'plan';

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>('details');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
  });

  const goToPlan = () => {
    setSubmitError(null);
    setStep('plan');
  };

  const goBack = () => {
    setSubmitError(null);
    setStep('details');
  };

  // One call: the profile, the first weight entry and the goal are one
  // transaction on the server (docs/adr/0016), so there is no half-saved plan to
  // recover from here — and no navigation either, since the action redirects.
  const handleConfirm = async (pace: Pace) => {
    setSubmitError(null);
    setSubmitting(true);
    const result = await createPlan({
      ...form.getValues(),
      preferredWeeklyChangeKg: pace,
    });
    // Only a failure returns; a success redirected out of this tree.
    setSubmitError(result.ok ? null : result.message);
    setSubmitting(false);
  };

  return step === 'plan' ? (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 pb-3.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={goBack}
          aria-label="Back"
          className="mb-2 -ml-2"
        >
          <ChevronLeft />
        </Button>
        <h1 className="font-heading text-2xl font-semibold">
          Choose your plan
        </h1>
        <p className="text-sm font-semibold text-muted-foreground">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      <PlanSelection
        input={form.getValues()}
        onConfirm={handleConfirm}
        submitting={submitting}
        submitError={submitError}
      />
    </div>
  ) : (
    <div className="mx-auto flex w-full max-w-md flex-col pt-1.5 pb-5">
      <div className="flex flex-col gap-1 px-5 pb-4.5">
        <h1 className="font-heading text-2xl font-semibold">
          Tell us about you
        </h1>
        <p className="text-sm font-semibold text-muted-foreground">
          We&apos;ll use this to calculate your daily calorie target.
        </p>
      </div>

      <DetailsForm form={form} onSubmit={goToPlan} />

      <Disclaimer className="px-5 pt-4 pb-1" />

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        <Button
          type="submit"
          form={DETAILS_FORM_ID}
          size="lg"
          className="w-full"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
