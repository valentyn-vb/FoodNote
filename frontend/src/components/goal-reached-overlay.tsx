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
import type { DialogRootChangeEventDetails } from '@base-ui/react/dialog';

// canvas-confetti paints on a canvas, so it can't take CSS variables — but it
// can take what they resolve to. Read at launch, not restated: this was the
// fourth copy of the brand palette in the codebase.
function confettiColors() {
  const style = getComputedStyle(document.documentElement);
  return ['--primary', '--brand-ink', '--chart-2', '--chart-3']
    .map((token) => style.getPropertyValue(token).trim())
    .filter(Boolean);
}

function fireConfetti() {
  const shared = {
    particleCount: 60,
    spread: 70,
    startVelocity: 45,
    colors: confettiColors(),
    disableForReducedMotion: true,
    zIndex: 100,
  };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
}

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
  const { goal, maintenanceKcal, refetchDashboard } = useMeals();
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
    eventDetails: DialogRootChangeEventDetails,
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
              <DialogTitle>You hit your target</DialogTitle>
              <DialogDescription>
                {goal
                  ? `You reached ${goal.targetWeightKg} kg. Pick where to go from here.`
                  : 'You reached your target weight.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  onClick={handleSwitchMaintenance}
                  disabled={switchingMaintenance}
                >
                  {switchingMaintenance ? '...' : 'Switch to maintenance'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {/* maintenanceKcal is energy at the current weight, which is
                      exactly what the target becomes at pace 0 — so it is the
                      number this button will set, not an estimate. */}
                  Keep your weight stable
                  {maintenanceKcal != null
                    ? ` on ${maintenanceKcal.toLocaleString()} kcal / day.`
                    : ' where it is now.'}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
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
                <p className="text-center text-sm text-muted-foreground">
                  Choose another plan — a new goal weight and pace.
                </p>
              </div>
            </div>
          </>
        )}

        {view === 'target-input' && (
          <>
            <DialogHeader className="gap-2">
              <DialogTitle variant="heading">
                What&apos;s your new target?
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
