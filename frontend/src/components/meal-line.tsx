'use client';

import { formatMealTime } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import type { MealResponse } from '@foodnote/shared';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MealLogDrawer } from './meal-log-drawer';

// A meal inside a meal-time group. A flat row, not a Card: these sit inside the
// group's own card, where a nested card reads heavy. (It replaced the former
// dashboard MealRow, which was a Card because it sat directly on the page
// background.) No NumberFlow either — these lists don't animate, so the calorie
// figure is plain text.
export function MealLine({ meal }: { meal: MealResponse }) {
  const { deleteMeal } = useMeals();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate font-sans text-label font-semibold text-text">
          {meal.mealName}
        </div>
        <div className="font-sans text-caption text-text-muted">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
          {formatMealTime(meal.recordedAt)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Edit ${meal.mealName}`}
          className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-track hover:text-text"
          onClick={() => setEditOpen(true)}
        >
          <Pencil size={16} />
        </button>
        <MealLogDrawer
          mode="edit"
          meal={meal}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <button
          type="button"
          aria-label={`Delete ${meal.mealName}`}
          className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-track hover:text-text"
          onClick={() => deleteMeal(meal)}
        >
          <Trash2 size={16} />
        </button>
        <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
          {meal.totalCalories} kcal
        </div>
      </div>
    </div>
  );
}

/** Shown in place of the meal lines when nothing was logged for a meal time. */
export function EmptyGroupLine() {
  return (
    <div className="px-4 py-3 font-sans text-caption text-text-muted">
      Nothing logged
    </div>
  );
}
