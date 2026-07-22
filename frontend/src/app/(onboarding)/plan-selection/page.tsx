'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { mockPlanOptions } from '@/lib/mock-data';
import { Disclaimer } from '@/components/disclaimer';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function PlanSelectionPage() {
  const [selectedLabel, setSelectedLabel] = useState('Moderate');

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

      <RadioGroup
        value={selectedLabel}
        onValueChange={(value) => setSelectedLabel(value as string)}
        className="gap-3 px-5"
      >
        {mockPlanOptions.map((plan) => {
          const selected = plan.label === selectedLabel;
          return (
            <label
              key={plan.label}
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
                  {plan.label} · {plan.ratePerWeek} kg/week
                </div>
                <RadioGroupItem
                  value={plan.label}
                  className="size-4.5 border-none bg-transparent data-checked:bg-primary"
                />
              </div>
              <div className="font-display text-[25px] font-semibold text-text">
                {plan.kcal.toLocaleString()} kcal / day
              </div>
              <div
                className={cn(
                  'font-sans text-[12.5px]',
                  selected ? 'text-primary-deep' : 'text-text-muted',
                )}
              >
                Goal date ~ {plan.goalDate} · {plan.weeksLeft} weeks
              </div>
            </label>
          );
        })}
      </RadioGroup>

      <Disclaimer className="px-5 pt-3.5" />

      <div className="px-5 pt-3">
        <Button
          nativeButton={false}
          render={<Link href="/dashboard" />}
          className="h-12.5 w-full rounded-sm bg-primary text-[15px] shadow-[0_2px_8px_#f5a65c59]"
        >
          Confirm plan
        </Button>
      </div>
    </div>
  );
}
