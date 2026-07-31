'use client';

import { OnboardingFormValues } from '@/components/onboarding/form-schema';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { goals, profile } from '@/lib/api-client';
import { type Pace, type ProfileResponse } from '@foodnote/shared';
import { useState } from 'react';
import { toast } from 'sonner';

type CurrentPlanSectionProps = {
  profileData: ProfileResponse | null;
  loading: boolean;
  onProfileChange: (profile: ProfileResponse) => void;
};

export function CurrentPlanSection({
  profileData,
  loading,
  onProfileChange,
}: CurrentPlanSectionProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (loading || submitting) return;
    if (next) setSubmitError(null);
    setOpen(next);
  }

  async function handleConfirm(pace: Pace) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await goals.update({ preferredWeeklyChangeKg: pace });
      // Re-read so the card shows the server-recomputed calorie target.
      const updated = await profile.current();
      onProfileChange(updated);
      setOpen(false);
      toast.success('Plan updated', {
        description:
          updated.calorieTarget != null
            ? `New daily calorie target: ${updated.calorieTarget.toLocaleString()} kcal`
            : undefined,
      });
    } catch {
      setSubmitError("Couldn't update your plan. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const target = profileData?.targetWeightKg;
  const pace = profileData?.preferredWeeklyChangeKg;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm text-muted-foreground">Current plan</h2>
      <Card className="gap-1 p-4">
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {profileData?.calorieTarget != null
            ? `${profileData.calorieTarget.toLocaleString()} kcal / day`
            : '—'}
        </p>
        <p className="text-sm text-muted-foreground">
          {pace == null
            ? 'No active plan yet'
            : pace === 0
              ? // Pace 0 is maintenance: "0 kg / week" reads as a broken value,
                // and the stored target is parked and irrelevant here.
                'Maintaining your weight'
              : `${pace} kg / week${target != null ? ` · target ${target} kg` : ''}`}
        </p>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger
            disabled={loading}
            // An unstyled primitive, so it renders *as* a Button rather than
            // restating a button's look.
            render={<Button variant="outline" size="sm" />}
            className="mt-1.5 w-fit"
          >
            {loading && <Spinner />}
            Change plan
          </DialogTrigger>
          <DialogContent className="p-0">
            {profileData && (
              <PlanSelection
                input={profileData as OnboardingFormValues}
                initialPace={profileData?.preferredWeeklyChangeKg ?? null}
                onConfirm={handleConfirm}
                submitting={submitting}
                submitError={submitError}
              />
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </section>
  );
}
