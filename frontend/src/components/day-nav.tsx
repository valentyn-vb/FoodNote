'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePathname, useRouter } from 'next/navigation';
import { StepperNav } from '@/components/stepper-nav';
import {
  DAY_PARAM,
  addDays,
  calendarDate,
  calendarDay,
  formatDayLabel,
  isFutureDay,
  todayUtc,
} from '@/lib/dashboard-transforms';

/**
 * ‹ [Today / date label] › navigation bar for the selected Tracking Day.
 *
 * The day is a `?date=` search parameter, so stepping it is a navigation: the
 * page re-reads on the server for the day it stepped to. It used to be
 * `useState` in `MealsProvider`, which is the only reason it survived moving
 * between the dashboard and /meals — the URL does that now, and it makes a day
 * shareable and bookmarkable besides.
 *
 * - Right arrow is disabled when the displayed day is already today.
 * - Future dates in the calendar picker are disabled.
 * - All date arithmetic runs in UTC so the boundary never depends on the
 *   viewer's local timezone offset.
 */
export function DayNav({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);
  // One `now` for the render, the way `WeightRangeNav` takes it as a prop: the
  // label, the disabled arrow and the calendar's bound cannot land on different
  // days.
  const now = new Date();
  const isToday = selectedDate === todayUtc(now);

  function goToDay(date: string) {
    if (isFutureDay(date, now)) return;
    // `push`, not `replace`: the day is where the user is, so Back should take
    // them to the day they came from.
    startTransition(() => {
      router.push(`${pathname}?${DAY_PARAM}=${date}`);
    });
  }

  // `calendarDate`/`calendarDay`, not `toISOString().slice(0, 10)`:
  // react-day-picker works in local midnight, so the UTC conversion names the day
  // *before* for any viewer east of UTC — tapping Aug 1 in Berlin asked for
  // Jul 31. The range picker learned this first; both calendars go through the
  // same two helpers now.
  const todayAsDate = calendarDate(todayUtc(now));
  const selectedAsDate = calendarDate(selectedDate);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    goToDay(calendarDay(date));
    setCalendarOpen(false);
  }

  return (
    <StepperNav
      previousLabel="Previous day"
      nextLabel="Next day"
      onPrevious={() => goToDay(addDays(selectedDate, -1))}
      onNext={() => goToDay(addDays(selectedDate, 1))}
      // Both arrows go dead while the navigation is in flight: each step is a
      // server read, and a second click during one steps from the day already
      // on screen rather than from the day being fetched.
      previousDisabled={isPending}
      nextDisabled={isToday || isPending}
    >
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger
          aria-label="Pick a date"
          render={
            <Button
              variant="ghost"
              className="min-w-32 h-8 rounded-sm text-sm tabular-nums"
            />
          }
        >
          {formatDayLabel(selectedDate, now)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            // The whole calendar sizes off `--cell-size`, 32 upstream. At 44
            // the popover is 332 of a 360px phone, which fits — and a date grid
            // is the one place where a missed tap silently opens the wrong day.
            className="[--cell-size:--spacing(11)]"
            mode="single"
            selected={selectedAsDate}
            onSelect={handleSelect}
            defaultMonth={selectedAsDate}
            disabled={(date) => date > todayAsDate}
          />
        </PopoverContent>
      </Popover>
    </StepperNav>
  );
}
