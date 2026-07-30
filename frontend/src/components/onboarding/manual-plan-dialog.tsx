'use client';

import { Button } from '@/components/ui/button';
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
  calorieTargetForPace,
  manualCalorieRange,
  paceForCalorieTarget,
  type Pace,
} from '@foodnote/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { OnboardingFormValues } from './form-schema';
import {
  MANUAL_PLAN_FORM_ID,
  ManualPlanForm,
  manualPlanFormSchema,
  type ManualPlanFormValues,
} from './manual-plan-form';

type ManualPlanDialogProps = {
  input: OnboardingFormValues;
  /** Plan start date, for the derived goal date. */
  fromDate: string;
  /**
   * The plan on screen when the dialog opens. The field starts on its calories,
   * so "create your own" means nudging the suggestion rather than typing into a
   * blank box — which is the case this whole flow exists for.
   */
  startFromPace: Pace | null;
  /**
   * True when the active plan is already a manual one, so this edits rather than
   * creates — the label has to say so, or "Create your own plan" reads as if the
   * plan they are already on is about to be thrown away.
   */
  isCustomPlan?: boolean;
  onConfirm: (pace: Pace) => void | Promise<void>;
};

/**
 * The manual plan, offered wherever plans are picked — onboarding, Settings ->
 * Change plan, and the goal-reached overlay all render PlanSelection, so all three
 * get it from one place. Self-contained: it owns the form state, the derived rate
 * and the save, so the preset picker stays a preset picker.
 *
 * It saves through the same `onConfirm(pace)` a preset card does, because a
 * manual plan is still just a Pace — the calories are what the user names and the
 * rate is what gets stored (see docs/adr/0009). No endpoint of its own.
 */
export function ManualPlanDialog({
  input,
  fromDate,
  startFromPace,
  isCustomPlan = false,
  onConfirm,
}: ManualPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const range = manualCalorieRange(input);
  const label = isCustomPlan ? 'Edit your custom plan' : 'Create your own plan';
  const form = useForm<ManualPlanFormValues>({
    resolver: zodResolver(manualPlanFormSchema(range)),
  });

  function handleOpenChange(next: boolean) {
    if (next)
      form.reset({
        dailyCalories:
          startFromPace !== null
            ? calorieTargetForPace(input, startFromPace)
            : range.max,
      });
    setOpen(next);
  }

  function handleConfirm({ dailyCalories }: ManualPlanFormValues) {
    // Close first, like the manual-meal dialog: the caller owns the request, and
    // it already renders its own submitting and error states behind this.
    setOpen(false);
    void onConfirm(paceForCalorieTarget(input, dailyCalories));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="link"
            className="h-auto p-0 text-caption text-text-muted text-primary-deep hover:bg-transparent"
          />
        }
      >
        {label}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-sans text-title font-semibold text-text">
            {label}
          </DialogTitle>
          <DialogDescription className="font-sans text-caption text-text-muted">
            Set the calories you want to eat and we&apos;ll work out the weekly
            rate and your goal date.
          </DialogDescription>
        </DialogHeader>

        <ManualPlanForm
          form={form}
          onSubmit={handleConfirm}
          input={input}
          fromDate={fromDate}
        />

        <DialogFooter className="flex-row justify-end gap-2.5">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" form={MANUAL_PLAN_FORM_ID} variant="cta">
            Use this plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
