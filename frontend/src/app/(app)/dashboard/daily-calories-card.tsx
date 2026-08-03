'use client';

import NumberFlow from '@number-flow/react';
import { CALORIE_SPLIT_COLORS, CalorieSplitDonut } from '@/components/charts';
import type { CalorieSplitSegment } from '@/lib/dashboard-transforms';
import { ChartCard } from './chart-card';
import { remainingStat } from './helpers';

/**
 * The day's calories as a ring, split by meal time. The ring answers "where did
 * the day go", which no other block on the screen does; the figure in its
 * middle repeats the headline number because a donut with an empty centre reads
 * as a chart missing its label.
 *
 * The figure is HTML over the SVG rather than SVG text: it is a NumberFlow, and
 * it needs an `sr-only` name a `<text>` inside a chart cannot carry.
 */
export function DailyCaloriesCard({
  segments,
  remainingKcal,
  className,
}: {
  segments: CalorieSplitSegment[];
  remainingKcal: number;
  className?: string;
}) {
  const logged = segments.filter((s) => s.key !== 'remaining');
  const { magnitude, unit, spoken } = remainingStat(remainingKcal);

  return (
    <ChartCard
      title="Daily calories"
      subtitle="Where the day went"
      className={className}
    >
      <div className="relative flex min-h-0 grow basis-0 items-center justify-center">
        <CalorieSplitDonut
          className="aspect-square h-full max-h-full w-auto"
          data={segments}
        />
        {/* Centred over the ring's hole; the ring itself takes no pointer
            events it needs to keep. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="sr-only">{spoken}</span>
          <span
            aria-hidden="true"
            className="font-heading text-2xl font-semibold tabular-nums"
          >
            <NumberFlow value={magnitude} />
          </span>
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
      </div>

      {logged.length > 0 && (
        <ul className="flex shrink-0 flex-wrap justify-center gap-x-3 gap-y-1">
          {logged.map((segment) => (
            <li
              key={segment.key}
              className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: CALORIE_SPLIT_COLORS[segment.key] }}
              />
              <span className="capitalize">{segment.key}</span>
              <span>{segment.kcal}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
