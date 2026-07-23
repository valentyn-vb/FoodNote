'use client';

import { Button } from '@/components/ui/button';
import {
  DetailsForm,
  DETAILS_FORM_ID,
} from '@/components/onboarding/details-form';
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
    <div className="mx-auto flex w-full max-w-md flex-col bg-bg pt-1.5 pb-5">
      <div className="flex flex-col gap-1 px-5 pb-4.5">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Tell us about you
        </h1>
        <p className="font-sans text-label text-text-muted">
          We&apos;ll use this to calculate your daily calorie target.
        </p>
      </div>

      <DetailsForm form={form} onSubmit={goToPlan} />

      <div className="px-5 pt-4 pb-1 font-sans text-[11.5px] text-text-muted">
        This is an estimate, not medical advice. Actual results vary.
      </div>

      <div className="flex flex-col gap-2.5 px-5 pt-3">
        <Button
          type="submit"
          form={DETAILS_FORM_ID}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
