'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StepperNav } from '@/components/stepper-nav';
import { useMeals } from '@/lib/meals-context';
import {
  addDays,
  formatDayLabel,
  isFutureDay,
} from '@/lib/dashboard-transforms';

/**
 * ‹ [Today / date label] › navigation bar for the selected Tracking Day. Shared
 * by the dashboard and /meals off one `selectedDate`, so stepping the day on
 * either moves both.
 *
 * - Right arrow is disabled when the displayed day is already today.
 * - Future dates in the calendar picker are disabled.
 * - All date arithmetic runs in UTC so the boundary never depends on the
 *   viewer's local timezone offset.
 */
export function DayNav() {
  const { selectedDate, setSelectedDate, isToday } = useMeals();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const now = new Date();
  const todayAsDate = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const selectedAsDate = new Date(`${selectedDate}T00:00:00Z`);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    const iso = date.toISOString().slice(0, 10);
    if (!isFutureDay(iso, new Date())) {
      setSelectedDate(iso);
    }
    setCalendarOpen(false);
  }

  return (
    <StepperNav
      previousLabel="Previous day"
      nextLabel="Next day"
      onPrevious={() => setSelectedDate(addDays(selectedDate, -1))}
      onNext={() => setSelectedDate(addDays(selectedDate, 1))}
      nextDisabled={isToday}
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
