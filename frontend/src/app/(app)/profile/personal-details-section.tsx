'use client';

import {
  DETAILS_FORM_ID,
  DetailsForm,
} from '@/components/onboarding/details-form';
import {
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
import { DetailRow } from '@/components/detail-row';
import { ACTIVITY_LEVEL_LABELS, SEX_LABELS } from '@/lib/enum-labels';
import { saveDetails } from '@/lib/actions/profile';
import type { ProfileResponse } from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Edit2Icon } from 'lucide-react';

export function PersonalDetailsSection({
  profile,
}: {
  profile: ProfileResponse;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
  });

  function handleOpenChange(next: boolean) {
    if (saving) return;
    if (next) {
      form.reset({
        age: profile.age,
        sex: profile.sex,
        heightCm: profile.heightCm,
        activityLevel: profile.activityLevel,
        currentWeightKg: profile.currentWeightKg ?? undefined,
        targetWeightKg: profile.targetWeightKg ?? undefined,
      });
    }
    setOpen(next);
  }

  async function handleSave(values: OnboardingFormValues) {
    // Closed first, deliberately: the write is three calls deep and the list
    // behind the dialog is where its result is read.
    setOpen(false);
    setSaving(true);

    const result = await saveDetails(values);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (result.data.replan) {
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
        result.data.calorieTarget != null &&
        result.data.calorieTarget !== profile.calorieTarget
          ? `New daily calorie target: ${result.data.calorieTarget.toLocaleString()} kcal`
          : undefined,
    });
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-sm text-muted-foreground">Personal details</h2>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger
            disabled={saving}
            render={<Button variant="outline" size="sm" />}
          >
            {saving ? <Spinner /> : <Edit2Icon className="size-3 mr-1" />}
            Edit details
          </DialogTrigger>
          {/* See edit-profile-dialog: upstream's DialogContent has no height
              cap, so with a keyboard up this one lost both its title and its
              "Save changes" off opposite edges. */}
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
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
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <dl className="divide-y divide-border">
          <DetailRow label="Sex" value={SEX_LABELS[profile.sex]} />
          <DetailRow label="Age" value={profile.age} />
          <DetailRow label="Height" value={`${profile.heightCm} cm`} />
          <DetailRow
            label="Weight goal"
            value={
              profile.targetWeightKg != null
                ? `${profile.targetWeightKg} kg`
                : 'Not set'
            }
          />
          <DetailRow
            label="Activity level"
            value={ACTIVITY_LEVEL_LABELS[profile.activityLevel]}
          />
        </dl>
      </Card>
    </section>
  );
}
