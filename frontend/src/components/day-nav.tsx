'use client';

import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { usePathname, useRouter } from 'next/navigation';
import {
  DAY_PARAM,
  addDays,
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
  const isToday = selectedDate === todayUtc(new Date());

  function goToDay(date: string) {
    if (isFutureDay(date, new Date())) return;
    // `push`, not `replace`: the day is where the user is, so Back should take
    // them to the day they came from.
    startTransition(() => {
      router.push(`${pathname}?${DAY_PARAM}=${date}`);
    });
  }

  const now = new Date();
  const todayAsDate = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const selectedAsDate = new Date(`${selectedDate}T00:00:00Z`);

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    goToDay(date.toISOString().slice(0, 10));
    setCalendarOpen(false);
  }

  return (
    // One control, not three: the arrows and the label share a card-coloured
    // track, so the group reads as a single day switcher on the page ground.
    //
    // `gap-2`, not `gap-0.5`: each arrow's touch target overflows its 36px box
    // by 4px a side, and at 2px of gap that overflow reached into the label,
    // handing the label's own edge to the arrow.
    <div className="h-10 inline-flex items-center gap-2 rounded-md border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        className="touch-target h-8 rounded-sm text-muted-foreground"
        aria-label="Previous day"
        disabled={isPending}
        onClick={() => goToDay(addDays(selectedDate, -1))}
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

      <Button
        variant="ghost"
        size="icon"
        className="touch-target h-8 rounded-sm text-muted-foreground"
        aria-label="Next day"
        disabled={isToday || isPending}
        onClick={() => goToDay(addDays(selectedDate, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
