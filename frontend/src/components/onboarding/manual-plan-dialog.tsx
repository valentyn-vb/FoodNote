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
  type PlanInput,
} from '@foodnote/shared';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  MANUAL_PLAN_FORM_ID,
  ManualPlanForm,
  manualPlanFormSchema,
  type ManualPlanFormValues,
} from './manual-plan-form';

type ManualPlanDialogProps = {
  input: PlanInput;
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
  /**
   * Drop the custom plan and fall back to a preset. Omitted when there is nothing
   * to drop, or when no preset is viable to fall back to — the button then simply
   * does not render, rather than being present and doing nothing.
   */
  onRemove?: () => void;
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
  onRemove,
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

  function handleRemove() {
    setOpen(false);
    onRemove?.();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="link" />}>{label}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
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

        {/* Three buttons will not sit in a row on a phone, so this keeps
            DialogFooter's own responsive stacking (flex-col-reverse below sm) and
            only pushes Remove to the far side once there is room. col-reverse also
            lands the destructive action at the bottom on mobile, under the two it
            should not be confused with. */}
        <DialogFooter
          className={cn(
            'gap-2.5 sm:items-center',
            onRemove ? 'sm:justify-between' : 'sm:justify-end',
          )}
        >
          {onRemove && (
            <Button type="button" variant="destructive" onClick={handleRemove}>
              <Trash2 size={16} />
              Remove custom plan
            </Button>
          )}
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" form={MANUAL_PLAN_FORM_ID}>
              Use this plan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
