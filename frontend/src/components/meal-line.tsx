'use client';

import { formatMealTime } from '@/lib/dashboard-transforms';
import { useMeals } from '@/lib/meals-context';
import type { MealResponse } from '@foodnote/shared';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
        {/* Wraps rather than truncating: in a four-column group at `xl` the
            name has ~150px beside the two icons and the figure, and a truncated
            "Greek yogurt with berrie…" tells you less than two lines do. */}
        <div className="text-sm font-semibold break-words">{meal.mealName}</div>
        <div className="text-sm text-muted-foreground">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
          {formatMealTime(meal.recordedAt)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${meal.mealName}`}
          onClick={() => setEditOpen(true)}
          className="text-muted-foreground"
        >
          <PencilIcon />
        </Button>
        <MealLogDrawer
          mode="edit"
          meal={meal}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${meal.mealName}`}
          onClick={() => deleteMeal(meal)}
          className="text-muted-foreground"
        >
          <Trash2Icon />
        </Button>
        <div className="text-sm font-semibold tabular-nums">
          {meal.totalCalories} kcal
        </div>
      </div>
    </div>
  );
}

/** Shown in place of the meal lines when nothing was logged for a meal time. */
export function EmptyGroupLine() {
  return (
    <div className="px-4 py-3 text-sm text-muted-foreground">
      Nothing logged
    </div>
  );
}
