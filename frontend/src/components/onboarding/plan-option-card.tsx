'use client';

import { Card } from '@/components/ui/card';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { Text } from '@/components/ui/text';
import { formatGoalDate } from '@/lib/utils';
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
  const tone = selected ? 'default' : 'muted';

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
        <Text variant="caption" tone={tone}>
          {isMaintenance ? 'Maintain your weight' : `${option.pace} kg / week`}
        </Text>
        <RadioGroupItem value={String(option.pace)} />
      </div>
      <Text variant="heading">
        {option.dailyCalorieTarget.toLocaleString()} kcal / day
      </Text>
      <Text variant="caption" tone={tone}>
        {isMaintenance
          ? 'Holds your current weight'
          : `Goal date ~ ${formatGoalDate(option.projectedGoalDate)}`}
      </Text>
    </Card>
  );
}
