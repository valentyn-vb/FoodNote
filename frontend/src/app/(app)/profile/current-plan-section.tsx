'use client';

import { OnboardingFormValues } from '@/components/onboarding/form-schema';
import { PlanSelection } from '@/components/onboarding/plan-selection';
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
      <h2 className="font-sans text-caption text-text-muted">Current plan</h2>
      <Card variant="panel" className="gap-1 border-[1.5px] p-4">
        <div className="font-display text-heading font-semibold text-text">
          {profileData?.calorieTarget != null
            ? `${profileData.calorieTarget.toLocaleString()} kcal / day`
            : '—'}
        </div>
        <div className="font-sans text-caption text-text-muted">
          {pace == null
            ? 'No active plan yet'
            : pace === 0
              ? // Pace 0 is maintenance: "0 kg / week" reads as a broken value,
                // and the stored target is parked and irrelevant here.
                'Maintaining your weight'
              : `${pace} kg / week${target != null ? ` · target ${target} kg` : ''}`}
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger
            disabled={loading}
            // DialogTrigger is an unstyled primitive, so unlike a Button it has
            // no radius of its own to inherit — this one is explicit on purpose.
            className="mt-1.5 inline-flex h-9.5 w-fit items-center gap-1.5 rounded-md border-[1.5px] border-primary bg-transparent px-3.5 font-sans text-label font-semibold text-primary-deep shadow-none hover:bg-primary-tint disabled:opacity-50"
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
