'use client';

import NumberFlow from '@number-flow/react';
import type { MealResponse } from '@foodnote/shared';
import { Card } from '@/components/ui/card';
import { formatMealTime } from '@/lib/dashboard-transforms';

// Shared by the mobile "Logged today" list and the desktop meals column.
export function MealRow({ meal }: { meal: MealResponse }) {
  return (
    // `shrink-0`: a row is one line of content, never a flexible space — inside
    // a bounded column it would otherwise squash before the column scrolled.
    // `rounded-md` matches the stat tiles above it; `panel`'s 20px belongs to
    // the full-width cards, and on a 64px row it read as a pill.
    <Card
      variant="panel"
      className="shrink-0 flex-row items-center justify-between rounded-md px-4 py-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-sans text-label font-semibold text-text">
          {meal.mealName}
        </div>
        <div className="font-sans text-[12px] text-text-muted">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
          {formatMealTime(meal.recordedAt)}
        </div>
      </div>
      <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
        <NumberFlow value={meal.totalCalories} suffix=" kcal" />
      </div>
    </Card>
  );
}
