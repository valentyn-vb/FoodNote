'use client';

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { Card } from '@/components/ui/card';
import { cn, formatGoalDate, formatPace } from '@/lib/utils';
import type { PlanOption } from '@foodnote/shared';

type PlanOptionCardProps = {
  option: PlanOption;
  selected: boolean;
};

// A single selectable plan option (pace · daily calories · goal date). Must be
// rendered inside a RadioGroup — it is the radio for option.pace, drawn as a
// plate the way the meal type and the appearance are, without an indicator
// beside the label.
export function PlanOptionCard({ option, selected }: PlanOptionCardProps) {
  // Pace 0 is the maintenance plan: "0 kg / week" is technically true but reads
  // like a broken value, and there is no goal date to show — formatGoalDate(null)
  // would print "Target already reached" on a plan just being started.
  const isMaintenance = option.pace === 0;
  // Selection is carried by the surface and by the text going from muted to
  // full weight — not by colouring the text orange, which measured 2.67:1.
  const tone = selected ? undefined : 'text-muted-foreground';

  const paceLine = isMaintenance
    ? 'Maintain your weight'
    : `${formatPace(option.pace)} kg / week`;
  const targetLine = `${option.dailyCalorieTarget.toLocaleString()} kcal / day`;
  const outcomeLine = isMaintenance
    ? 'Holds your current weight'
    : `Goal date ~ ${formatGoalDate(option.projectedGoalDate)}`;

  return (
    <Card
      // The card *is* the radio, so the whole plate takes the focus ring and
      // arrow keys move between plates. Spelt out in `aria-label` because the
      // three lines are the name of this option and a radio does not take one
      // from its contents here — the group would otherwise announce five
      // unnamed choices.
      render={
        <RadioPrimitive.Root
          value={String(option.pace)}
          aria-label={`${paceLine}, ${targetLine}, ${outcomeLine}`}
        />
      }
      // A tile you choose between: the card surface, plus a selected state
      // driven by `data-checked`. The border keeps its width and only changes
      // colour — thickening it on selection shifts the content half a pixel in
      // every direction, which reads as a twitch.
      className="cursor-pointer gap-2 rounded-lg px-4 py-4 text-left shadow-none transition-colors duration-150 outline-none hover:border-primary/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-accent"
    >
      <span aria-hidden className={cn('block text-sm', tone)}>
        {paceLine}
      </span>
      <span
        aria-hidden
        className="block text-2xl font-bold tracking-tight tabular-nums"
      >
        {targetLine}
      </span>
      <span aria-hidden className={cn('block text-sm', tone)}>
        {outcomeLine}
      </span>
    </Card>
  );
}
