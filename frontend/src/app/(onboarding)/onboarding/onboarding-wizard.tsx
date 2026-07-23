'use client';

import { DetailsForm } from '@/components/onboarding/details-form';
import {
  onboardingFormSchema,
  type OnboardingFormValues,
} from '@/components/onboarding/form-schema';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { goals, profile, weights } from '@/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Pace } from '@foodnote/shared';

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
    <DetailsForm form={form} onContinue={goToPlan} />
  );
}
