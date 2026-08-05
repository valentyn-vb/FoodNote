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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createPlan } from '@/lib/actions/plan';
import type { Pace } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ReviewStep } from './review-step';

type Step = 'details' | 'plan' | 'review';

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>('details');
  const [pace, setPace] = useState<Pace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fixed once, and read by both the picker and the review step: derived twice
  // it would differ across midnight, and the goal date confirmed would not be
  // the one chosen.
  const [fromDate] = useState(() => new Date().toISOString().slice(0, 10));

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
  });

  const goToPlan = () => {
    setSubmitError(null);
    setStep('plan');
  };

  const goToReview = (picked: Pace) => {
    setSubmitError(null);
    setPace(picked);
    setStep('review');
  };

  const goBack = (to: Step) => () => {
    setSubmitError(null);
    setStep(to);
  };

  // One call: the profile, the first weight entry and the goal are one
  // transaction on the server (docs/adr/0016), so there is no half-saved plan to
  // recover from here — and no navigation either, since the action redirects.
  const handleConfirm = async () => {
    if (pace === null) return;
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

  // Unreachable through the UI — the pace is set on the way in. It guards a hot
  // reload, which restores the step and not the state beside it.
  if (step === 'review' && pace !== null) {
    return (
      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">Step 3 of 3</p>
          <CardTitle className="text-xl font-bold">Check it over</CardTitle>
          <CardDescription>Nothing is saved until you confirm.</CardDescription>
        </CardHeader>

        <CardContent>
          <ReviewStep
            values={form.getValues()}
            pace={pace}
            fromDate={fromDate}
            submitting={submitting}
            submitError={submitError}
            onBack={goBack('plan')}
            onConfirm={handleConfirm}
          />
        </CardContent>
      </Card>
    );
  }

  return step === 'plan' ? (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Step 2 of 3</p>
        <CardTitle className="text-xl font-bold">Choose your plan</CardTitle>
        <CardDescription>
          Based on your goal, here are a few daily-calorie options.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <PlanSelection
          input={form.getValues()}
          fromDate={fromDate}
          onConfirm={goToReview}
          confirmLabel="Review"
          secondaryAction={
            // `px-6` matches the confirm button beside it: `lg` is px-2.5, and
            // two buttons ending a step should not be padded differently.
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={goBack('details')}
              className="px-6"
            >
              <ChevronLeft />
              Back
            </Button>
          }
        />
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">Step 1 of 3</p>
        <CardTitle className="text-xl font-bold">Tell us about you</CardTitle>
        <CardDescription>
          We&apos;ll use this to calculate your daily calorie target.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <DetailsForm form={form} onSubmit={goToPlan} />
      </CardContent>

      {/* `items-stretch` because CardFooter is `flex items-center`, which would
          otherwise shrink a full-width button to the width of its text. */}
      <CardFooter className="flex-col items-stretch gap-4">
        <Disclaimer />
        <Button type="submit" form={DETAILS_FORM_ID} size="lg">
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
