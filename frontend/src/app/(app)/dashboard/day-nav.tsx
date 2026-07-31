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
 * ‹ [Today / date label] › navigation bar for the dashboard.
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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-text-muted hover:text-text"
        aria-label="Previous day"
        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
      >
        <ChevronLeft size={18} />
      </Button>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger
          className="min-w-24 rounded-md px-2.5 py-1 font-sans text-[13.5px] font-medium text-text hover:bg-[#F5F3EF] focus:outline-none"
          aria-label="Pick a date"
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
        className="size-8 text-text-muted hover:text-text disabled:opacity-30"
        aria-label="Next day"
        disabled={isToday}
        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
      >
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}
