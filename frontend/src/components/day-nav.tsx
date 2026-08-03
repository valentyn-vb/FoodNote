'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
    // One control, not three: the arrows and the label share a card-coloured
    // track, so the group reads as a single day switcher on the page ground.
    <div className="h-10 inline-flex items-center gap-0.5 rounded-md border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 rounded-sm text-muted-foreground"
        aria-label="Previous day"
        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
      >
        <ChevronLeft className="size-5" />
      </Button>

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
            mode="single"
            selected={selectedAsDate}
            onSelect={handleSelect}
            defaultMonth={selectedAsDate}
            disabled={(date) => date > todayAsDate}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 rounded-sm text-muted-foreground"
        aria-label="Next day"
        disabled={isToday}
        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
