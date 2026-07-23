'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GoalResponse, ProfileResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DetailsForm,
  DETAILS_FORM_ID,
} from '@/components/onboarding/details-form';
import {
  DEFAULT_PLAN_PACE,
  onboardingFormSchema,
  type OnboardingFormValues,
} from '@/components/onboarding/form-schema';
import { ACTIVITY_LEVEL_LABELS } from '@/lib/activity-levels';
import { ApiError, goals, profile, weights } from '@/lib/api-client';
import { DetailRow } from './detail-row';

const SEX_LABELS = { female: 'Female', male: 'Male' } as const;

export function PersonalDetailsSection() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [goalData, setGoalData] = useState<GoalResponse | null>(null);
  const [open, setOpen] = useState(false);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      profile.current(),
      // No active goal yet is a known empty state, not an error.
      goals.current().catch((err) => {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }),
    ])
      .then(([p, g]) => {
        if (cancelled) return;
        setProfileData(p);
        setGoalData(g);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load your details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (next && profileData) {
      form.reset({
        age: profileData.age,
        sex: profileData.sex,
        heightCm: profileData.heightCm,
        activityLevel: profileData.activityLevel,
        currentWeightKg: profileData.currentWeightKg ?? undefined,
        targetWeightKg:
          goalData?.targetWeightKg ?? profileData.currentWeightKg ?? undefined,
      });
    }
    setOpen(next);
  }

  async function handleSave(values: OnboardingFormValues) {
    if (!profileData) return;
    const previousProfile = profileData;
    const previousGoal = goalData;

    setOpen(false);
    setLoading(true);
    try {
      const updatedProfile = await profile.put({
        age: values.age,
        sex: values.sex,
        heightCm: values.heightCm,
        activityLevel: values.activityLevel,
      });

      // Each of these is a distinct journal/goal write, so only fire them
      // when the relevant value actually changed — otherwise saving an
      // unrelated field (e.g. activity level) would spam the weight journal
      // or reset the goal's start date/weight for no reason.
      if (values.currentWeightKg !== previousProfile.currentWeightKg) {
        await weights.create({
          weightKg: values.currentWeightKg,
          recordedAt: new Date().toISOString(),
        });
      }

      let updatedGoal = previousGoal;
      if (values.targetWeightKg !== previousGoal?.targetWeightKg) {
        updatedGoal = await goals.create({
          targetWeightKg: values.targetWeightKg,
          preferredWeeklyChangeKg:
            previousGoal?.preferredWeeklyChangeKg ?? DEFAULT_PLAN_PACE,
        });
      }

      setProfileData({
        ...updatedProfile,
        currentWeightKg: values.currentWeightKg,
      });
      setGoalData(updatedGoal);
      toast.success('Details updated');
    } catch {
      toast.error("Couldn't save your details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-sans text-caption text-text-muted">
        Personal details
      </h2>
      <Card className="gap-0 overflow-hidden rounded-lg border-[1.5px] border-border bg-surface py-0 ring-0">
        <dl>
          <DetailRow
            label="Sex"
            value={profileData ? SEX_LABELS[profileData.sex] : '—'}
          />
          <DetailRow label="Age" value={profileData?.age ?? '—'} />
          <DetailRow
            label="Height"
            value={profileData ? `${profileData.heightCm} cm` : '—'}
          />
          <DetailRow
            label="Weight goal"
            value={
              goalData
                ? `${goalData.targetWeightKg} kg`
                : profileData
                  ? 'Not set'
                  : '—'
            }
          />
          <DetailRow
            label="Activity level"
            value={
              profileData
                ? ACTIVITY_LEVEL_LABELS[profileData.activityLevel]
                : '—'
            }
          />
        </dl>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          disabled={loading}
          className="inline-flex h-auto w-fit items-center gap-1.5 p-0 font-sans text-label font-semibold text-primary-deep hover:bg-transparent disabled:opacity-50"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Edit details
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sans text-title font-semibold text-text">
              Edit details
            </DialogTitle>
            <DialogDescription className="font-sans text-caption text-text-muted">
              We&apos;ll use this to recalculate your daily calorie target.
            </DialogDescription>
          </DialogHeader>

          <DetailsForm form={form} onSubmit={handleSave} />

          <DialogFooter className="flex-row justify-end gap-2.5">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" form={DETAILS_FORM_ID} variant="cta">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
