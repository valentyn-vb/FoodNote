'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'motion/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  weightKgSchema,
  type Pace,
  type ProfileResponse,
} from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlanSelection } from '@/components/onboarding/plan-selection';
import { InputField } from '@/components/form-fields';
import { goals, profile } from '@/lib/api-client';
import { useMeals } from '@/lib/meals-context';
import type { DialogPrimitive } from '@base-ui/react/dialog';

const CONFETTI_COLORS = ['#f5a65c', '#e08a3c', '#5bb98c', '#f4907e'];

function fireConfetti() {
  const shared = {
    particleCount: 60,
    spread: 70,
    startVelocity: 45,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    zIndex: 100,
  };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
}

type DialogEventDetails = Parameters<
  NonNullable<DialogPrimitive.Root.Props['onOpenChange']>
>[1];

const targetWeightSchema = z.object({
  targetWeightKg: weightKgSchema,
});

type TargetWeightForm = z.infer<typeof targetWeightSchema>;

type DialogView = 'choice' | 'target-input' | 'target-plan';

/**
 * Non-dismissable celebration and required action dialog for a reached goal.
 * Once a goal is reached, the user must choose: switch to maintenance or set a
 * new target. Closing happens only after one of those actions completes
 * successfully (refetchDashboard flips reachedTarget to false). X, Escape, and
 * outside-click are blocked.
 *
 * No new state is persisted to the server: the dialog is driven purely by
 * reachedTarget on the dashboard payload, so dismissal is implicit in the
 * action result.
 */
export function GoalReachedOverlay() {
  const { goal, refetchDashboard } = useMeals();
  const shouldReduceMotion = useReducedMotion();
  const [view, setView] = useState<DialogView>('choice');
  const [switchingMaintenance, setSwitchingMaintenance] = useState(false);
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [targetWeightValue, setTargetWeightValue] = useState<number | null>(
    null,
  );

  const form = useForm<TargetWeightForm>({
    resolver: zodResolver(targetWeightSchema),
  });

  const open = goal?.reachedTarget ?? false;

  useEffect(() => {
    if (!open || shouldReduceMotion) return;
    fireConfetti();
  }, [open, shouldReduceMotion]);

  const handleOpenChange = (
    newOpen: boolean,
    eventDetails: DialogEventDetails,
  ) => {
    if (!newOpen) {
      eventDetails.cancel();
    }
  };

  async function handleSwitchMaintenance() {
    setSwitchingMaintenance(true);
    try {
      await goals.update({ preferredWeeklyChangeKg: 0 });
      await refetchDashboard();
      toast.success('Switched to maintenance', {
        description: goal
          ? `Your daily calories now hold you at ${goal.currentWeightKg} kg.`
          : undefined,
      });
    } catch {
      toast.error("Couldn't switch to maintenance. Please try again.");
    } finally {
      setSwitchingMaintenance(false);
    }
  }

  async function handleTargetInputContinue(data: TargetWeightForm) {
    try {
      setTargetWeightValue(data.targetWeightKg);
      const profileResponse = await profile.current();
      setProfileData(profileResponse);
      setView('target-plan');
    } catch {
      form.setError('targetWeightKg', {
        message: "Couldn't load your profile. Please try again.",
      });
    }
  }

  async function handlePlanConfirm(pace: Pace) {
    if (!targetWeightValue) return;
    try {
      await goals.create({
        targetWeightKg: targetWeightValue,
        preferredWeeklyChangeKg: pace,
      });
      await refetchDashboard();
      toast.success('New target set', {
        description: `Target: ${targetWeightValue} kg · ${pace} kg/week`,
      });
    } catch {
      toast.error("Couldn't set your new target. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      modal={true}
      disablePointerDismissal={true}
    >
      <DialogContent className="max-w-sm" showCloseButton={false}>
        {view === 'choice' && (
          <>
            <DialogHeader className="items-center gap-2 text-center">
              <Image
                src="/mascot/celebrate.webp"
                alt=""
                width={96}
                height={96}
                priority
              />
              <DialogTitle className="font-display text-title font-semibold text-text">
                You hit your target
              </DialogTitle>
              <DialogDescription className="font-sans text-caption text-text-muted">
                {goal
                  ? `You reached ${goal.targetWeightKg} kg. Your daily calories now hold you there — switch to maintenance or set a new target.`
                  : 'You reached your target weight.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="button"
                variant="cta"
                onClick={handleSwitchMaintenance}
                disabled={switchingMaintenance}
              >
                {switchingMaintenance ? '...' : 'Switch to maintenance'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setView('target-input');
                  form.reset({ targetWeightKg: goal?.currentWeightKg });
                }}
                disabled={switchingMaintenance}
              >
                Set a new target
              </Button>
            </div>
          </>
        )}

        {view === 'target-input' && (
          <>
            <DialogHeader className="gap-2">
              <DialogTitle className="font-display text-heading font-semibold text-text">
                What's your new target?
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(handleTargetInputContinue)}
              className="flex flex-col gap-4"
            >
              <InputField
                id="targetWeightKg"
                label="Target weight (kg)"
                type="number"
                inputMode="numeric"
                error={form.formState.errors.targetWeightKg?.message}
                {...form.register('targetWeightKg', { valueAsNumber: true })}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView('choice')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="cta"
                  disabled={form.formState.isSubmitting}
                  className="flex-1"
                >
                  {form.formState.isSubmitting ? '...' : 'Continue'}
                </Button>
              </div>
            </form>
          </>
        )}

        {view === 'target-plan' && profileData && targetWeightValue && (
          <PlanSelection
            input={{
              ...profileData,
              targetWeightKg: targetWeightValue,
              currentWeightKg:
                profileData.currentWeightKg ?? goal?.currentWeightKg ?? 0,
            }}
            onBack={() => setView('target-input')}
            onConfirm={handlePlanConfirm}
            fromDate={new Date().toISOString().slice(0, 10)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
