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
  return (
    <label
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
}
