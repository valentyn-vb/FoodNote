'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The `‹ … ›` track both window switchers sit in: the day nav on /dashboard and
 * /meals, and the range nav on /weights.
 *
 * A component rather than a repeated class list, per the styling rule — the two
 * had already drifted (one carried no border and stood 4px taller), which is
 * precisely what a shared look expressed twice does. The middle is a slot
 * because one caller opens a calendar from it and the other just names a span.
 */
export function StepperNav({
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  children,
}: {
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    // One control, not three: the arrows and what they move share a track, so
    // the group reads as a single switcher on the page ground.
    //
    // `gap-2`, not `gap-0.5`: each arrow's touch target overflows its 36px box
    // by 4px a side, and at 2px of gap that overflow reached into the label,
    // handing the label's own edge to the arrow.
    <div className="inline-flex h-10 items-center gap-2 rounded-md border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        className="touch-target h-8 rounded-sm text-muted-foreground"
        aria-label={previousLabel}
        disabled={previousDisabled}
        onClick={onPrevious}
      >
        <ChevronLeft className="size-5" />
      </Button>

      {children}

      <Button
        variant="ghost"
        size="icon"
        className="touch-target h-8 rounded-sm text-muted-foreground"
        aria-label={nextLabel}
        disabled={nextDisabled}
        onClick={onNext}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
