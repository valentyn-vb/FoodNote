'use client';

import NumberFlow from '@number-flow/react';
import type { MealResponse } from '@foodnote/shared';
import { Card } from '@/components/ui/card';
import { formatMealTime } from '@/lib/dashboard-transforms';
import { CARD_CLASS } from './helpers';

// Shared by the mobile "Logged today" list and the desktop meals column.
export function MealRow({ meal }: { meal: MealResponse }) {
  return (
    <Card
      className={`${CARD_CLASS} flex-row items-center justify-between px-4 py-3.5`}
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
