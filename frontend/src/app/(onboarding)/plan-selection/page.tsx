'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getOnboardingValues } from '@/lib/onboarding-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { buildPlanOptions } from '@foodnote/shared';

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
  // Simulated "GET profile": read what onboarding mock-saved. Null on reload or
  // direct navigation (module state is cleared), so bounce back to onboarding.
  const values = getOnboardingValues();

  const options = useMemo(
    () =>
      values
        ? buildPlanOptions({
            ...values,
            fromDate: new Date().toISOString().slice(0, 10),
          })
        : [],
    [values],
  );

  const [selectedPace, setSelectedPace] = useState<number | null>(
    () => options[0]?.pace ?? null,
  );

  useEffect(() => {
    if (!values) router.replace('/onboarding');
  }, [values, router]);

  if (!values) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-muted" />
      </div>
    );
  }

  const onConfirm = () => {
    // Mock-save the goal, then finish. Real path:
    // POST /goals { targetWeightKg: values.targetWeightKg,
    //               preferredWeeklyChangeKg: selectedPace }.
    // TODO(goal-persistence): create the goal once the endpoint exists.
    router.push('/dashboard');
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 bg-bg pt-2.5 pb-4.5">
      <div className="flex flex-col gap-1 px-5 pb-3.5">
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.01em] text-text">
          Choose your plan
        </h1>
        <p className="font-sans text-label text-text-muted">
          Based on your goal, here are a few daily-calorie options.
        </p>
      </div>

      {options.length === 0 ? (
        <p className="px-5 py-4 font-sans text-label text-text-muted">
          No safe plan reaches this target from your current weight. Try a
          smaller change.
        </p>
      ) : (
        <RadioGroup
          value={selectedPace !== null ? String(selectedPace) : ''}
          onValueChange={(value) => setSelectedPace(Number(value))}
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
