'use client';

import { PlanSelection } from '@/components/onboarding/plan-selection';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { changePlanPace } from '@/lib/actions/goals';
import { formatPace } from '@/lib/utils';
import {
  type Pace,
  type PlanInput,
  type ProfileResponse,
} from '@foodnote/shared';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export function CurrentPlanSection({ profile }: { profile: ProfileResponse }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (next) setSubmitError(null);
    setOpen(next);
  }

  async function handleConfirm(pace: Pace) {
    setSubmitError(null);
    setSubmitting(true);

    const result = await changePlanPace(pace);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    setOpen(false);
    toast.success('Plan updated', {
      description:
        result.data.calorieTarget != null
          ? `New daily calorie target: ${result.data.calorieTarget.toLocaleString()} kcal`
          : undefined,
    });
  }

  const target = profile.targetWeightKg;
  const pace = profile.preferredWeeklyChangeKg;

  // Memoised because PlanSelection keys its option math on this object.
  const planInput: PlanInput | null = useMemo(
    () =>
      profile.currentWeightKg != null && profile.targetWeightKg != null
        ? {
            age: profile.age,
            sex: profile.sex,
            heightCm: profile.heightCm,
            activityLevel: profile.activityLevel,
            currentWeightKg: profile.currentWeightKg,
            targetWeightKg: profile.targetWeightKg,
          }
        : null,
    [profile],
  );

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm text-muted-foreground px-2">Current plan</h2>
      <Card className="gap-1 p-4">
        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {profile.calorieTarget != null
            ? `${profile.calorieTarget.toLocaleString()} kcal / day`
            : '—'}
        </p>
        <p className="text-sm text-muted-foreground">
          {pace == null
            ? 'No active plan yet'
            : pace === 0
              ? // Pace 0 is maintenance: "0 kg / week" reads as a broken value,
                // and the stored target is parked and irrelevant here.
                'Maintaining your weight'
              : `${formatPace(pace)} kg / week${target != null ? ` · target ${target} kg` : ''}`}
        </p>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger
            // The plan math needs a weight to compute from and a target to
            // reach, and PATCH /goals/current needs the goal that supplies the
            // target — without both there is nothing to change.
            disabled={planInput === null}
            // An unstyled primitive, so it renders *as* a Button rather than
            // restating a button's look.
            render={<Button variant="outline" size="sm" className="w-fit" />}
          >
            Change plan
          </DialogTrigger>
          {/* The option list is the tall part, so the dialog caps its own
              height and scrolls — the plan picker no longer brings its own. */}
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Change plan</DialogTitle>
              <DialogDescription>
                Pick a new pace — your daily calorie target moves with it.
              </DialogDescription>
            </DialogHeader>

            {planInput && (
              <PlanSelection
                input={planInput}
                initialPace={pace ?? null}
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
