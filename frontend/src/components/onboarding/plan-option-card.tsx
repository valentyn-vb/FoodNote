'use client';

import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatGoalDate } from '@/lib/utils';
import type { PlanOption } from '@foodnote/shared';

type PlanOptionCardProps = {
  option: PlanOption;
  selected: boolean;
};

// A single selectable plan option (pace · daily calories · goal date). Must be
// rendered inside a RadioGroup — it owns a RadioGroupItem keyed by option.pace.
export function PlanOptionCard({ option, selected }: PlanOptionCardProps) {
  // Pace 0 is the maintenance plan: "0 kg / week" is technically true but reads
  // like a broken value, and there is no goal date to show — formatGoalDate(null)
  // would print "Target already reached" on a plan just being started.
  const isMaintenance = option.pace === 0;

  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-1.5 rounded-md px-4.5 py-4 transition-colors duration-150',
        selected
          ? 'border-2 border-primary bg-primary-tint-soft shadow-selected'
          : 'border border-border bg-surface shadow-hairline',
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            'font-sans text-[12.5px] font-medium',
            selected ? 'text-primary-deep' : 'text-text-muted',
          )}
        >
          {isMaintenance ? 'Maintain your weight' : `${option.pace} kg / week`}
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
        {isMaintenance
          ? 'Holds your current weight'
          : `Goal date ~ ${formatGoalDate(option.projectedGoalDate)}`}
      </div>
    </label>
  );
}
