'use client';

import NumberFlow from '@number-flow/react';
import { Card } from '@/components/ui/card';
import { type Meal } from '@/lib/mock-data';
import { CARD_CLASS } from './helpers';

// Shared by the mobile "Logged today" list and the desktop meals column.
export function MealRow({ meal }: { meal: Meal }) {
  return (
    <Card
      className={`${CARD_CLASS} flex-row items-center justify-between px-4 py-3.5`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-sans text-label font-semibold text-text">
          {meal.name}
        </div>
        <div className="font-sans text-[12px] text-text-muted">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} · {meal.loggedAt}
        </div>
      </div>
      <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
        <NumberFlow value={meal.kcal} suffix=" kcal" />
      </div>
    </Card>
  );
}
