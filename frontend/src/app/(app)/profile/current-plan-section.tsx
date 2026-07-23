'use client';

import { OnboardingFormValues } from '@/components/onboarding/form-schema';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { goals, profile } from '@/lib/api-client';
import type { Pace, ProfileResponse } from '@foodnote/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function CurrentPlanSection() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profile
      .current()
      .then((p) => {
        if (!cancelled) setProfileData(p);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your plan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setProfileData(updated);
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
      <Card className="gap-1 rounded-lg border-[1.5px] border-border bg-surface p-4 py-4 shadow-[0_1px_3px_#0000000a] ring-0">
        <div className="font-display text-heading font-semibold text-text">
          {profileData?.calorieTarget != null
            ? `${profileData.calorieTarget.toLocaleString()} kcal / day`
            : '—'}
        </div>
        <div className="font-sans text-caption text-text-muted">
          {pace != null
            ? `${pace} kg / week${target != null ? ` · target ${target} kg` : ''}`
            : 'No active plan yet'}
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger
            disabled={loading}
            className="mt-1.5 inline-flex h-9.5 w-fit items-center gap-1.5 rounded-sm border-[1.5px] border-primary bg-transparent px-3.5 font-sans text-label font-semibold text-primary-deep shadow-none hover:bg-[#FFF3E7] disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Change plan
          </DialogTrigger>
          <DialogContent className="p-0">
            {profileData && (
              <PlanSelection
                input={profileData as OnboardingFormValues}
                initialPace={profileData?.preferredWeeklyChangeKg ?? null}
                onBack={() => handleOpenChange(false)}
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
