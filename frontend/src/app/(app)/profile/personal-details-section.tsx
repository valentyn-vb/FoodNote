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
import { Spinner } from '@/components/ui/spinner';
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
import { cn } from '@/lib/utils';
import { goals, profile, weights } from '@/lib/api-client';
import type { ProfileResponse } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

const SEX_LABELS = { female: 'Female', male: 'Male' } as const;

/**
 * One label/value pair of the details list. The dividers live on the `<dl>`
 * rather than as a `border-b … last:border-b-0` on every row. `numeric` gives
 * the value tabular figures — a weight, an age.
 */
function DetailRow({
  label,
  value,
  numeric = true,
}: {
  label: string;
  value: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd
        className={cn(
          'text-sm font-semibold text-muted-foreground',
          numeric && 'tabular-nums',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

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
    const weightChanged = values.currentWeightKg !== previous.currentWeightKg;
    const targetWeightChanged =
      values.targetWeightKg !== previous.targetWeightKg;
    try {
      if (weightChanged) {
        await weights.create({
          weightKg: values.currentWeightKg,
          recordedAt: new Date().toISOString(),
        });
      }
      if (targetWeightChanged) {
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
      if (weightChanged || targetWeightChanged) {
        toast.warning('Details saved — check your plan', {
          description:
            'Your daily target was recalculated. The pace behind it may no longer fit — review it under Current plan.',
          position: 'top-center',
          closeButton: true,
          duration: Infinity,
        });
        return;
      }

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
      <h2 className="text-sm text-muted-foreground">Personal details</h2>
      <Card className="gap-0 overflow-hidden py-0">
        <dl className="divide-y divide-border">
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
          render={<Button variant="link" />}
        >
          {(loading || saving) && <Spinner />}
          Edit details
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
            <DialogDescription>
              We&apos;ll use this to recalculate your daily calorie target.
            </DialogDescription>
          </DialogHeader>

          <DetailsForm form={form} onSubmit={handleSave} />

          <DialogFooter className="flex-row justify-end gap-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" form={DETAILS_FORM_ID}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
