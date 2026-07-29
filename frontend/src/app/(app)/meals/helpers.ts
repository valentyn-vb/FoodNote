import {
  mealTypeSchema,
  type MealResponse,
  type MealType,
} from '@foodnote/shared';

export type MealGroup = {
  mealType: MealType;
  meals: MealResponse[];
  totalKcal: number;
};

/**
 * Today's meals split into the four meal times. Always returns all four groups
 * — an empty breakfast is information ("nothing logged"), not a group to hide,
 * and keeping the shape fixed lets both layouts render without null checks.
 *
 * Group order comes from mealTypeSchema.options (the contract's own order:
 * breakfast → lunch → dinner → snack) rather than a second hardcoded list that
 * could drift from it.
 *
 * Within a group meals run oldest → newest, so a group reads top-down in the
 * order it was eaten. The caller's list is newest-first (useMeals sorts that way
 * to match its optimistic prepend), so this re-sorts rather than inheriting it.
 */
export function groupMealsByType(meals: MealResponse[]): MealGroup[] {
  return mealTypeSchema.options.map((mealType) => {
    const inGroup = meals
      .filter((meal) => meal.mealType === mealType)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

    return {
      mealType,
      meals: inGroup,
      totalKcal: inGroup.reduce((sum, meal) => sum + meal.totalCalories, 0),
    };
  });
}

/** "420 kcal · 2 meals" — the subtotal line every group header shows. */
export function formatGroupSummary(group: MealGroup): string {
  const meals = `${group.meals.length} ${group.meals.length === 1 ? 'meal' : 'meals'}`;
  return `${group.totalKcal} kcal · ${meals}`;
}
