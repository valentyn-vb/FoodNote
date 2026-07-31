'use client';

import { Card } from '@/components/ui/card';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatGoalDate, formatPace } from '@/lib/utils';
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
  // Selection is carried by the surface and by the text going from muted to
  // full weight — not by colouring the text orange, which measured 2.67:1.
  const tone = selected ? undefined : 'text-muted-foreground';

  return (
    <Card
      data-selected={selected || undefined}
      render={<label />}
      // A tile you choose between: the card surface, plus a selected state
      // driven by `data-selected`. The border keeps its width and only changes
      // colour — thickening it on selection shifts the content half a pixel in
      // every direction, which reads as a twitch.
      className="cursor-pointer gap-1.5 rounded-lg px-4.5 py-4 transition-colors duration-150 data-selected:border-primary data-selected:bg-accent"
    >
      <div className="flex items-center justify-between">
        <p className={cn('text-sm', tone)}>
          {isMaintenance
            ? 'Maintain your weight'
            : `${formatPace(option.pace)} kg / week`}
        </p>
        <RadioGroupItem value={String(option.pace)} />
      </div>
      <p className="font-heading text-2xl font-semibold tabular-nums">
        {option.dailyCalorieTarget.toLocaleString()} kcal / day
      </p>
      <p className={cn('text-sm', tone)}>
        {isMaintenance
          ? 'Holds your current weight'
          : `Goal date ~ ${formatGoalDate(option.projectedGoalDate)}`}
      </p>
    </Card>
  );
}
