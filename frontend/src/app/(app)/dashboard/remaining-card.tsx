'use client';

import NumberFlow from '@number-flow/react';
import { Mascot } from '@/components/mascot';
import { Progress } from '@/components/ui/progress';
import { fullnessMascot, remainingStat } from './helpers';
import { StatCard, StatFigure } from '@/components/stat-card';

/**
 * What is left of the day's budget: the figure, the bar, and the two numbers
 * the bar is made of. The mascot sits with the "eaten" half because that is
 * the number its expression reflects.
 *
 * Over budget the figure goes negative and the bar stays full — Progress
 * clamps — so the sentence beneath it carries the overshoot instead.
 */
export function RemainingCard({
  label,
  remainingKcal,
  eatenKcal,
  goalKcal,
  progressPct,
}: {
  label: string;
  remainingKcal: number;
  eatenKcal: number;
  goalKcal: number;
  progressPct: number;
}) {
  const { magnitude, unit, spoken } = remainingStat(remainingKcal, label);

  return (
    <StatCard label={label}>
      <span className="sr-only">{spoken}</span>

      <StatFigure unit={unit}>
        <NumberFlow value={magnitude} />
      </StatFigure>

      <Progress value={progressPct} className="mt-auto" />

      <p
        aria-hidden="true"
        className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums"
      >
        {/* `priority`: this is the dashboard's first card at every width, so the
            figure beside it paints while a lazy image is still being asked for. */}
        <Mascot
          src={fullnessMascot(eatenKcal, goalKcal)}
          className="w-5"
          priority
        />
        <span>
          <NumberFlow value={eatenKcal} /> / <NumberFlow value={goalKcal} />
          {' kcal · '}
          <NumberFlow value={progressPct} suffix="% of target" />
        </span>
      </p>
    </StatCard>
  );
}
