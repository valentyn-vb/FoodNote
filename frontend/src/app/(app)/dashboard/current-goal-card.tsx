'use client';

import { Badge } from '@/components/ui/badge';
import type { GoalDirection } from '@/lib/dashboard-transforms';
import { formatGoalDate } from '@/lib/dashboard-transforms';
import { cn, formatPace } from '@/lib/utils';
import { formatFigure } from './helpers';
import { StatCard } from './stat-card';

const DIRECTION_LABEL: Record<GoalDirection, string> = {
  lose: 'Lose weight',
  gain: 'Gain weight',
  maintain: 'Maintain weight',
};

/**
 * The plan in four lines: what it is, the budget it prescribes, the rate it
 * assumes, and when it lands.
 *
 * All three rows are present in every state, with the text doing the work —
 * dropping the two that mean nothing on a maintenance plan would leave one
 * card half the height of the three beside it.
 *
 * Pace comes from the goal, not from the calories: with the target clamped to
 * the Safety Floor, the budget no longer implies the rate the plan was made at.
 */
export function CurrentGoalCard({
  direction,
  calorieTarget,
  pace,
  projectedGoalDate,
  reachedTarget,
}: {
  direction: GoalDirection;
  calorieTarget: number;
  pace: number;
  projectedGoalDate: string | null;
  reachedTarget: boolean;
}) {
  const signedPace =
    direction === 'maintain'
      ? '—'
      : `${direction === 'lose' ? '−' : '+'}${formatPace(pace)} kg / week`;

  const goalDate = reachedTarget
    ? 'Reached'
    : projectedGoalDate === null
      ? 'No end date'
      : formatGoalDate(projectedGoalDate);

  const rows = [
    {
      label: 'Target intake',
      value: `${formatFigure(calorieTarget)} kcal/day`,
    },
    { label: 'Pace', value: signedPace },
    { label: 'Goal date', value: goalDate, emphasised: true },
  ];

  return (
    <StatCard label="Current goal">
      <Badge className="bg-primary/15 text-sm text-brand-ink">
        {reachedTarget ? 'Target reached' : DIRECTION_LABEL[direction]}
      </Badge>

      <dl className="flex flex-col gap-1.5 mt-auto">
        {rows.map(({ label, value, emphasised }) => (
          // Wraps as a whole row — label above value — rather than breaking
          // "2,156 kcal/day" across two lines, which is what a plain
          // justify-between does once the card is under about 260px.
          <div
            key={label}
            className={cn(
              'flex flex-wrap items-baseline justify-between gap-x-3',
              // The emphasised row is the plan's conclusion, so a rule sets it
              // apart from the two inputs above it — dashed, to read as a
              // summary line rather than another border in a bordered card.
              emphasised && 'border-t border-dashed border-border pt-2',
            )}
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                'text-sm font-semibold whitespace-nowrap tabular-nums',
                emphasised && 'text-brand-ink',
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </StatCard>
  );
}
