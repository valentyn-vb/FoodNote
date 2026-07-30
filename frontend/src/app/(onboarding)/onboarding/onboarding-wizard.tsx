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
import { Text } from '@/components/ui/text';
import { goals, profile, weights } from '@/lib/api-client';
import type { Pace } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type Step = 'details' | 'plan';

export function OnboardingWizard() {
  const router = useRouter();
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

  const handleConfirm = async (pace: Pace) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const values = form.getValues();
      await profile.put({
        age: values.age,
        sex: values.sex,
        heightCm: values.heightCm,
        activityLevel: values.activityLevel,
      });
      // Weight is written only to the journal, never the profile.
      await weights.create({
        weightKg: values.currentWeightKg,
        recordedAt: new Date().toISOString(),
      });
      await goals.create({
        targetWeightKg: values.targetWeightKg,
        preferredWeeklyChangeKg: pace,
      });
      router.push('/dashboard');
    } catch {
      setSubmitError("Couldn't save your plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return step === 'plan' ? (
    <PlanSelection
      input={form.getValues()}
      onBack={goBack}
      onConfirm={handleConfirm}
      submitting={submitting}
      submitError={submitError}
    />
  ) : (
    <div className="mx-auto flex w-full max-w-md flex-col pt-1.5 pb-5">
      <div className="flex flex-col gap-1 px-5 pb-4.5">
        <Text variant="heading" render={<h1 />}>
          Tell us about you
        </Text>
        <Text variant="label" tone="muted" render={<p />}>
          We&apos;ll use this to calculate your daily calorie target.
        </Text>
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
