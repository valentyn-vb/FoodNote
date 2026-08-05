'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * The shell the four stat cards share: a muted label over whatever the card
 * counts. A component rather than a className constant, because the look
 * belongs to four call sites and nothing else in the app draws this label.
 *
 * The label is a real heading — four numbers in a row need names in the
 * document outline, not just visually.
 */
export function StatCard({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    // Tighter than the chart cards on purpose: four of these sit in one row
    // above the fold, and each holds a figure and a line or two, not a plot.
    <Card className={cn('gap-2.5 p-4', className)}>
      <h2 className="text-base font-semibold tracking-normal text-muted-foreground">
        {label}
      </h2>
      {children}
    </Card>
  );
}

/**
 * One figure with its unit: the display number every stat card leads with.
 * Fredoka and the display size are the point — this is the one thing on the
 * card meant to be read from across the room.
 *
 * The caller owns the accessible name (see `spokenStat`): NumberFlow exposes
 * none, so everything here is hidden from the accessibility tree.
 */
export function StatFigure({
  children,
  unit,
}: {
  children: ReactNode;
  unit: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="flex items-baseline gap-1.5 font-heading text-3xl font-semibold tabular-nums"
    >
      {children}
      <span className="text-base font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}
