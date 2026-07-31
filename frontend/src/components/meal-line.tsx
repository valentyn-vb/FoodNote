import type { MealResponse } from '@foodnote/shared';
import { formatMealTime } from '@/lib/dashboard-transforms';

// A meal inside a meal-time group. A flat row, not a Card: these sit inside the
// group's own card, where a nested card reads heavy. (It replaced the former
// dashboard MealRow, which was a Card because it sat directly on the page
// background.) No NumberFlow either — these lists don't animate, so the calorie
// figure is plain text.
export function MealLine({ meal }: { meal: MealResponse }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate text-sm font-semibold">{meal.mealName}</div>
        <div className="text-sm text-muted-foreground">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
          {formatMealTime(meal.recordedAt)}
        </div>
      </div>
      <div className="shrink-0 text-sm font-semibold tabular-nums">
        {meal.totalCalories} kcal
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
