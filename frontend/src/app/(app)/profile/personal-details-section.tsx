'use client';

import {
  DETAILS_FORM_ID,
  DetailsForm,
} from '@/components/onboarding/details-form';
import {
  DEFAULT_PLAN_PACE,
  onboardingFormSchema,
  type OnboardingFormValues,
} from '@/components/onboarding/form-schema';
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
import { ACTIVITY_LEVEL_LABELS } from '@/lib/activity-levels';
import { goals, profile, weights } from '@/lib/api-client';
import type { ProfileResponse } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DetailRow } from './detail-row';

const SEX_LABELS = { female: 'Female', male: 'Male' } as const;

type PersonalDetailsSectionProps = {
  profileData: ProfileResponse | null;
  loading: boolean;
  onProfileChange: (profile: ProfileResponse) => void;
};

export function PersonalDetailsSection({
  profileData,
  loading,
  onProfileChange,
}: PersonalDetailsSectionProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
  });

  function handleOpenChange(next: boolean) {
    if (loading || saving) return;
    if (next && profileData) {
      form.reset({
        age: profileData.age,
        sex: profileData.sex,
        heightCm: profileData.heightCm,
        activityLevel: profileData.activityLevel,
        currentWeightKg: profileData.currentWeightKg ?? undefined,
        targetWeightKg: profileData.targetWeightKg ?? undefined,
      });
    }
    setOpen(next);
  }

  async function handleSave(values: OnboardingFormValues) {
    if (!profileData) return;
    const previous = profileData;

    setOpen(false);
    setSaving(true);
    try {
      if (values.currentWeightKg !== previous.currentWeightKg) {
        await weights.create({
          weightKg: values.currentWeightKg,
          recordedAt: new Date().toISOString(),
        });
      }
      if (values.targetWeightKg !== previous.targetWeightKg) {
        await goals.create({
          targetWeightKg: values.targetWeightKg,
          preferredWeeklyChangeKg:
            previous.preferredWeeklyChangeKg ?? DEFAULT_PLAN_PACE,
        });
      }
      const updated = await profile.put({
        ...previous,
        ...values,
      });
      onProfileChange({
        ...updated,
        currentWeightKg: values.currentWeightKg,
        targetWeightKg: values.targetWeightKg,
      });
      toast.success('Details updated', {
        description:
          updated.calorieTarget &&
          updated.calorieTarget !== previous.calorieTarget
            ? `New daily calorie target: ${updated.calorieTarget.toLocaleString()} kcal`
            : undefined,
      });
    } catch {
      toast.error("Couldn't save your details. Please try again.");
    } finally {
      setSaving(false);
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
              profileData?.targetWeightKg != null
                ? `${profileData.targetWeightKg} kg`
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
          disabled={loading || saving}
          className="inline-flex h-auto w-fit items-center gap-1.5 p-0 font-sans text-label font-semibold text-primary-deep hover:bg-transparent disabled:opacity-50"
        >
          {(loading || saving) && <Loader2 className="size-4 animate-spin" />}
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
