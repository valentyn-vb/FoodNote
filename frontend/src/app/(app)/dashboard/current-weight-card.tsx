'use client';

import NumberFlow from '@number-flow/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { GoalDirection } from '@/lib/dashboard-transforms';
import { remainingToGoalKg } from '@/lib/dashboard-transforms';
import { cn } from '@/lib/utils';
import { spokenStat } from './helpers';
import { StatCard, StatFigure } from './stat-card';

/**
 * The weight on the Tracking Day on show, how it moved over the week before it,
 * and how far the target still is.
 *
 * The week's change is highlighted only when it moves toward the target, and
 * the other case is muted rather than red: a week of the scale going the wrong
 * way is information, not a failure to colour-code at the user.
 */
export function CurrentWeightCard({
  label,
  currentWeightKg,
  targetWeightKg,
  weekChangeKg,
  direction,
}: {
  label: string;
  /** Read at the Tracking Day on show, so a past day gets that day's weight. */
  currentWeightKg: number;
  targetWeightKg: number;
  /** Null when the journal doesn't reach back a week. */
  weekChangeKg: number | null;
  direction: GoalDirection;
}) {
  // Null on a maintenance plan — nothing to be short of.
  const remainingKg = remainingToGoalKg(
    currentWeightKg,
    targetWeightKg,
    direction,
  );
  const moving = weekChangeKg !== null && weekChangeKg !== 0;
  const towardGoal =
    moving &&
    (direction === 'lose'
      ? weekChangeKg < 0
      : direction === 'gain'
        ? weekChangeKg > 0
        : false);
  const Arrow = moving && weekChangeKg < 0 ? ArrowDown : ArrowUp;

  return (
    <StatCard label={label}>
      <span className="sr-only">
        {spokenStat(label, currentWeightKg, ' kg')}
      </span>
      <StatFigure unit="kg">
        <NumberFlow value={currentWeightKg} />
      </StatFigure>

      {weekChangeKg === null ? (
        <p className="text-sm text-muted-foreground">
          No weigh-in from a week ago to compare
        </p>
      ) : (
        <p
          className={cn(
            'flex w-fit items-center gap-1.5 rounded-4xl px-2.5 py-0.5 text-sm font-medium tabular-nums',
            towardGoal
              ? 'bg-success/15 text-success-text'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <span className="sr-only">
            {spokenStat('Change this week', weekChangeKg, ' kg')}
          </span>
          {moving && <Arrow aria-hidden="true" className="size-3.5" />}
          <span aria-hidden="true">
            <NumberFlow value={Math.abs(weekChangeKg)} suffix=" kg" />
            {' this week'}
          </span>
        </p>
      )}

      <p className="text-sm text-muted-foreground tabular-nums">
        {remainingKg === null
          ? `Holding at ${targetWeightKg} kg`
          : remainingKg === 0
            ? `Goal weight ${targetWeightKg} kg · reached`
            : `Goal weight ${targetWeightKg} kg · ${remainingKg} kg to go`}
      </p>
    </StatCard>
  );
}
