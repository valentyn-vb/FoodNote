'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { getOnboardingData } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  buildPlanOptions,
  type GoalResponse,
  type Pace,
  type ProfileResponse,
} from '@foodnote/shared';

function formatGoalDate(date: string | null): string {
  if (!date) return 'Target already reached';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PlanSelectionPage() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [goalData, setGoalData] = useState<GoalResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pickedPace, setPickedPace] = useState<Pace | null>(null);

  // A missing profile or goal means onboarding isn't complete -> back to the form.
  useEffect(() => {
    let cancelled = false;
    getOnboardingData()
      .then(({ profile: p, goal: g }) => {
        if (cancelled) return;
        if (!p || !g) {
          router.replace('/onboarding');
          return;
        }
        setProfileData(p);
        setGoalData(g);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const options = useMemo(() => {
    if (!profileData || !goalData) return [];
    return buildPlanOptions({
      age: profileData.age,
      sex: profileData.sex,
      heightCm: profileData.heightCm,
      activityLevel: profileData.activityLevel,
      currentWeightKg: goalData.startWeightKg,
      targetWeightKg: goalData.targetWeightKg,
      fromDate: new Date().toISOString().slice(0, 10),
    });
  }, [profileData, goalData]);

  const defaultPace = useMemo<Pace | null>(() => {
    if (options.length === 0) return null;
    return options.some((option) => option.pace === 0.5)
      ? 0.5
      : options[0].pace;
  }, [options]);

  const selectedPace = pickedPace ?? defaultPace;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const onConfirm = () => {
    // The goal already exists (created on form submit with the default pace).
    // Applying a changed pace (PATCH /goals/current) is the next step.
    //router.push('/dashboard');
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 bg-bg pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 px-5 pb-3.5">
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          aria-label="Back"
          className="mb-2 flex size-5.5 shrink-0 items-center justify-center"
        >
          <ChevronLeft size={18} className="text-[#333333]" strokeWidth={2} />
        </button>
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Choose your plan
        </h1>
        <p className="font-sans text-label text-text-muted">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="px-5 py-4 font-sans text-label text-destructive"
        >
          Couldn&apos;t load your plan. Please refresh and try again.
        </p>
      ) : options.length === 0 ? (
        <p className="px-5 py-4 font-sans text-label text-text-muted">
          No safe plan reaches this target from your current weight. Try a
          smaller change.
        </p>
      ) : (
        <RadioGroup
          value={selectedPace !== null ? String(selectedPace) : ''}
          onValueChange={(value) => setPickedPace(Number(value) as Pace)}
          className="gap-3 px-5"
        >
          {options.map((option) => {
            const selected = option.pace === selectedPace;
            return (
              <label
                key={option.pace}
                className={cn(
                  'flex cursor-pointer flex-col gap-1.5 rounded-md px-4.5 py-4 transition-colors duration-150',
                  selected
                    ? 'border-2 border-primary bg-[#FFF9F3] shadow-[0_4px_14px_#f5a65c29]'
                    : 'border border-border bg-surface shadow-[0_1px_2px_#00000008]',
                )}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'font-sans text-[12.5px] font-medium',
                      selected ? 'text-primary-deep' : 'text-text-muted',
                    )}
                  >
                    {option.pace} kg / week
                  </div>
                  <RadioGroupItem
                    value={String(option.pace)}
                    className="size-4.5 border-none bg-transparent data-checked:bg-primary"
                  />
                </div>
                <div className="font-display text-[25px] font-semibold text-text">
                  {option.dailyCalorieTarget.toLocaleString()} kcal / day
                </div>
                <div
                  className={cn(
                    'font-sans text-[12.5px]',
                    selected ? 'text-primary-deep' : 'text-text-muted',
                  )}
                >
                  Goal date ~ {formatGoalDate(option.projectedGoalDate)}
                </div>
              </label>
            );
          })}
        </RadioGroup>
      )}

      <div className="px-5 pt-3.5 font-sans text-[11.5px] text-text-muted">
        This is an estimate, not medical advice. Actual results vary.
      </div>

      <div className="px-5 pt-3">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={selectedPace === null}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          Confirm plan
        </Button>
      </div>
    </div>
  );
}
