import type { MealResponse } from '@foodnote/shared';
import { formatMealTime } from '@/lib/dashboard-transforms';

// A meal inside a meal-time group. Deliberately not the dashboard's MealRow:
// that one is a Card because it sits directly on the page background, whereas
// these sit inside the group's own card, where a nested card would read wrong.
// No NumberFlow either — nothing on this page animates, so the calorie figure
// is plain text.
export function MealLine({ meal }: { meal: MealResponse }) {
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
      <div className="shrink-0 font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
        {meal.totalCalories} kcal
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
