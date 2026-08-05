'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import { StepperNav } from '@/components/stepper-nav';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { todayUtc } from '@/lib/dashboard-transforms';
import {
  RANGE_FROM_PARAM,
  RANGE_LABELS,
  RANGE_TO_PARAM,
  WEIGHT_RANGE_PRESETS,
  calendarDate,
  calendarDay,
  canStepForward,
  matchPreset,
  presetRange,
  rangeLabel,
  shiftRange,
  type WeightRange,
  type WeightRangePreset,
} from '@/lib/weight-range';

/**
 * Which span of the weight journal is on screen: a preset length, a step
 * through the journal in units of that length, or two dates picked by hand.
 *
 * The window is `?from=&to=`, so changing it is a navigation and the page
 * re-reads on the server for the window it moved to — the same shape `DayNav`
 * has, and it makes a span shareable besides. It was `useState` on the page,
 * which is the half of #148 that did not survive the server-first move: the
 * chart, the change figures and the entry list are one server read now, so they
 * still cannot describe different windows.
 *
 * `now` stays a prop rather than read from the clock: the page passes the same
 * instant it derived its figures from, so the label and the numbers cannot land
 * on different days, and the module's convention is that time is passed in
 * (dashboard-transforms' header) so this stays testable without faking a clock.
 *
 * Which preset reads as pressed is derived from the range, never stored, so a
 * hand-picked window presses none of them: the row cannot say "30 days" over a
 * fortnight the reader chose.
 */
export function WeightRangeNav({
  range,
  now,
}: {
  range: WeightRange;
  now: Date;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  // The calendar's own draft, cleared each time it opens so picking a window is
  // always the same two clicks. Seeding it with the current range instead would
  // make the first click *extend* that range and commit on the spot, which is a
  // different gesture depending on which day you happen to hit.
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const active = matchPreset(range, now);

  function goToRange(next: WeightRange) {
    const params = new URLSearchParams({
      [RANGE_FROM_PARAM]: next.from,
      [RANGE_TO_PARAM]: next.to,
    });
    // `push`, not `replace`: the window is where the reader is, so Back should
    // take them to the span they came from — as stepping the day does.
    startTransition(() => {
      router.push(`${pathname}?${params}`);
    });
  }

  function handleSelect(next: DateRange | undefined) {
    setDraft(next);
    if (!next?.from || !next.to) return;
    goToRange({ from: calendarDay(next.from), to: calendarDay(next.to) });
    setCalendarOpen(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <StepperNav
        previousLabel="Earlier period"
        nextLabel="Later period"
        onPrevious={() => goToRange(shiftRange(range, -1, now))}
        onNext={() => goToRange(shiftRange(range, 1, now))}
        // Both arrows go dead while the navigation is in flight: each step is a
        // server read, and a second click during one steps from the window
        // already on screen rather than from the one being fetched.
        previousDisabled={isPending}
        nextDisabled={!canStepForward(range, now) || isPending}
      >
        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            setCalendarOpen(open);
            if (open) setDraft(undefined);
          }}
        >
          <PopoverTrigger
            aria-label="Pick a date range"
            render={
              <Button
                variant="ghost"
                className="h-8 min-w-40 rounded-sm text-sm tabular-nums"
              />
            }
          >
            {rangeLabel(range)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              // The whole calendar sizes off `--cell-size`, 32 upstream. At 44
              // the popover is 332 of a 360px phone, which fits — and a date
              // grid is the one place where a missed tap silently opens the
              // wrong window.
              className="[--cell-size:--spacing(11)]"
              mode="range"
              // A window of one day is not a window: every change figure under
              // it would compare a reading against itself. `min` makes the
              // second click land on a different day or clear the draft.
              min={1}
              selected={draft}
              onSelect={handleSelect}
              defaultMonth={calendarDate(range.to)}
              disabled={{ after: calendarDate(todayUtc(now)) }}
            />
          </PopoverContent>
        </Popover>
      </StepperNav>

      <ToggleGroup
        // Empty when the reader picked their own dates: no preset describes
        // that window, so none of them may look chosen.
        value={active ? [active] : []}
        onValueChange={(values) => {
          const next = values[0] as WeightRangePreset | undefined;
          // Changing the length always returns to the window ending today —
          // "three periods back" is 90 days at 30D and three years at 1Y, so
          // carrying a past window across a change lands somewhere nobody
          // asked for.
          if (next) goToRange(presetRange(next, now));
        }}
        // The group has no visible label to bind to, so it names itself or a
        // screen reader announces five bare options.
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
