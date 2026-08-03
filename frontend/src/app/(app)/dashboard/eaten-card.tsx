'use client';

import NumberFlow from '@number-flow/react';
import { spokenStat } from './helpers';
import { StatCard, StatFigure } from './stat-card';

/**
 * What the day added up to: total calories over the three macro totals. The
 * macros are the day's own figures from the read model, never re-summed from
 * the meal list — a meal's totals are the source of truth, and its items are
 * allowed to disagree with them.
 */
export function EatenCard({
  label,
  eatenKcal,
  proteinGrams,
  carbsGrams,
  fatGrams,
}: {
  label: string;
  eatenKcal: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}) {
  // Whole grams: the totals carry a decimal from the AI parse, and tenths of a
  // gram of protein are noise beside a figure the user typed by hand.
  // In the contract's own order.
  const macros = [
    ['Protein', Math.round(proteinGrams)],
    ['Carbs', Math.round(carbsGrams)],
    ['Fats', Math.round(fatGrams)],
  ] as const;

  return (
    <StatCard label={label}>
      <span className="sr-only">{spokenStat(label, eatenKcal, ' kcal')}</span>
      <StatFigure unit="kcal">
        <NumberFlow value={eatenKcal} />
      </StatFigure>

      {/* Three columns, never wrapping: left to flex-wrap, the third tile drops
          to its own row at the card's narrowest and makes this card taller than
          the three beside it. */}
      <dl className="grid grid-cols-3 gap-2 mt-auto">
        {macros.map(([name, grams]) => (
          <div key={name} className="rounded-md bg-muted px-3 py-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground">
              {name}
            </dt>
            <dd className="text-base font-semibold tabular-nums">
              <span className="sr-only">{spokenStat(name, grams, 'g')}</span>
              <span aria-hidden="true">
                <NumberFlow value={grams} suffix="g" />
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </StatCard>
  );
}
