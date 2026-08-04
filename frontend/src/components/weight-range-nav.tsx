'use client';

import { StepperNav } from '@/components/stepper-nav';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  RANGE_LABELS,
  WEIGHT_RANGE_PRESETS,
  canStepForward,
  rangeLabel,
  type WeightRangePreset,
} from '@/lib/weight-range';

export type WeightRangeSelection = {
  preset: WeightRangePreset;
  offset: number;
};

/**
 * Which span of the weight journal is on screen: a preset length, and how many
 * of those periods back from today.
 *
 * Controlled, and `now` is a prop rather than read from the clock — the page
 * owns the selection so the chart, the change figures and the entry list all
 * read one range, and the module's own convention is that time is passed in
 * (dashboard-transforms' header) so this stays testable without faking a clock.
 */
export function WeightRangeNav({
  preset,
  offset,
  now,
  onChange,
}: WeightRangeSelection & {
  now: Date;
  onChange: (next: WeightRangeSelection) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <StepperNav
        previousLabel="Earlier period"
        nextLabel="Later period"
        onPrevious={() => onChange({ preset, offset: offset - 1 })}
        onNext={() => onChange({ preset, offset: offset + 1 })}
        nextDisabled={!canStepForward(offset)}
      >
        {/* The same height and type as the day nav's own middle, which is a
            button because it opens a calendar; this one only names the span. */}
        <span className="flex h-8 min-w-40 items-center justify-center text-sm tabular-nums">
          {rangeLabel(preset, offset, now)}
        </span>
      </StepperNav>

      <ToggleGroup
        value={[preset]}
        // Changing the length always returns to the window ending today:
        // "three periods back" is 90 days at 30D and three years at 1Y, so
        // carrying the offset across a change lands somewhere nobody asked for.
        onValueChange={(values) => {
          const next = values[0] as WeightRangePreset | undefined;
          if (next) onChange({ preset: next, offset: 0 });
        }}
        // The group has no visible label to bind to, so it names itself or a
        // screen reader announces four bare options.
        aria-label="Range"
        spacing={1}
        className="gap-1"
      >
        {WEIGHT_RANGE_PRESETS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            aria-label={RANGE_LABELS[option]}
            className="border border-border bg-card px-3 text-muted-foreground tabular-nums hover:border-primary/60 data-pressed:border-primary data-pressed:bg-accent data-pressed:font-semibold data-pressed:text-foreground"
          >
            {/* Two text nodes, one button: five long labels do not fit a
                phone row, and the short forms read as jargon where there is
                room to spell them out. Both are hidden from the accessibility
                tree and the button carries the full form as its name, so a
                screen reader hears "1 year" at every width rather than
                "1Y 1 year" — CSS decides which is visible, and CSS is not
                something the accessibility tree reads. */}
            <span aria-hidden="true" className="md:hidden">
              {option}
            </span>
            <span aria-hidden="true" className="hidden md:inline">
              {RANGE_LABELS[option]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
