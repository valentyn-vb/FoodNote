import {
  caloriesFromMacros,
  type MacroTotals,
  type MealItem,
} from '@foodnote/shared';

/**
 * The arithmetic behind reviewing a Parsed Meal, kept pure and free of React
 * so the one genuinely subtle rule in the flow — when a meal's totals stop
 * tracking its items — has a statement independent of the component.
 *
 * The server never sums items (ADR-0008): summing here is an editing aid, and
 * a total the user set by hand always wins.
 */

/** The items' own macro numbers, added up. */
export function sumItems(items: MealItem[]): MacroTotals {
  return items.reduce<MacroTotals>(
    (total, item) => ({
      totalCalories: total.totalCalories + item.calories,
      proteinGrams: total.proteinGrams + item.proteinGrams,
      carbsGrams: total.carbsGrams + item.carbsGrams,
      fatGrams: total.fatGrams + item.fatGrams,
    }),
    { totalCalories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
  );
}

/**
 * How far the stated calories may sit from what the macros imply before it is
 * worth mentioning. Wide enough to ignore rounding and the usual label
 * imprecision, narrow enough to catch a misplaced digit.
 */
const MACRO_DIVERGENCE_THRESHOLD = 0.15;

/**
 * The macro-derived calorie figure, but only when it is worth offering: the
 * macros must say something (all-zero is the "calories only" case, not a
 * disagreement) and must diverge beyond the threshold. Null means stay quiet.
 *
 * This never blocks a save — the user may know about alcohol, fibre or a label
 * that simply doesn't add up.
 */
export function macroCalorieSuggestion(totals: MacroTotals): number | null {
  const { totalCalories, proteinGrams, carbsGrams, fatGrams } = totals;
  if (proteinGrams === 0 && carbsGrams === 0 && fatGrams === 0) return null;

  const fromMacros = caloriesFromMacros({
    proteinGrams,
    carbsGrams,
    fatGrams,
  });
  // Against the macro figure, not the stated one: a stated 0 kcal alongside
  // real macros is exactly the mistake worth flagging, and dividing by it
  // would make the check unreachable.
  if (fromMacros === 0) return null;
  const divergence = Math.abs(fromMacros - totalCalories) / fromMacros;
  return divergence > MACRO_DIVERGENCE_THRESHOLD ? fromMacros : null;
}
