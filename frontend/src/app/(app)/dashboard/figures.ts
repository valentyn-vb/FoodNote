import type {
  DashboardResponse,
  ListMealsResponse,
  ListWeightsResponse,
} from '@foodnote/shared';
import {
  bucketDailyCalories,
  buildWeightTrend,
  computeWeightChange,
  todayUtc,
  todaysMeals,
  weightAsOf,
  weightChangeOverDays,
} from '@/lib/dashboard-transforms';

/**
 * Every figure the dashboard draws, derived in one pass.
 *
 * This is what the two providers' `useMemo` bodies were: pure functions over the
 * three responses, computed on every client render because that is where the data
 * happened to be. Nothing here needs a browser, so it runs on the server and the
 * client receives numbers instead of the arithmetic that produces them.
 *
 * The anchor is the **selected** Tracking Day, not today. Passing the server's
 * current weight instead once compared the latest reading against a week before
 * the selected day, and a past day's card read "9.6 kg this week" off two numbers
 * seven months of plan apart.
 */
export function dashboardFigures({
  dashboard,
  meals,
  weights,
  now,
}: {
  dashboard: DashboardResponse;
  meals: ListMealsResponse;
  weights: ListWeightsResponse;
  now: Date;
}) {
  const goal = dashboard.goal;
  const goalKcal = dashboard.calorieTarget;
  const eatenKcal = dashboard.today.totalCalories;

  // The selected day standing in for "now" in every journal derivation below,
  // anchored at the **end** of it. A weigh-in logged at any hour belongs to the
  // Tracking Day it was logged on and has to count as its weight: anchored at
  // midnight, today's weigh-in reads as tomorrow's and the card keeps showing
  // yesterday's figure — which is exactly what it did until this line said
  // 23:59. Noon was wrong for the same reason, half as often.
  const anchor = new Date(`${dashboard.date}T23:59:59.999Z`);

  const currentWeightKg = weightAsOf(weights, anchor, goal.currentWeightKg);
  const change = computeWeightChange(weights, currentWeightKg, anchor);

  return {
    isToday: dashboard.date === todayUtc(now),
    goal,
    goalKcal,
    eatenKcal,
    // Signed: a day over budget is a number the dashboard states, not one it
    // floors away. `progressPct` stays clamped — the bar fills once.
    remainingKcal: goalKcal - eatenKcal,
    progressPct:
      goalKcal > 0
        ? Math.min(100, Math.round((eatenKcal / goalKcal) * 100))
        : 0,
    // Straight from the read model, never re-summed from the meal list, whose
    // items may legitimately disagree with it.
    macros: {
      proteinGrams: dashboard.today.proteinGrams,
      carbsGrams: dashboard.today.carbsGrams,
      fatGrams: dashboard.today.fatGrams,
    },
    selectedDayMeals: todaysMeals(meals, dashboard.date),
    dailyCalories: bucketDailyCalories(meals, dashboard.date),
    // The count, not the entries. The trend card names how many readings its
    // line is drawn from and nothing else needs them — the journal itself is
    // /weights now, so shipping every entry to the client bought one integer.
    weighInCount: weights.length,
    currentWeightKg,
    weightTrend: buildWeightTrend(
      weights,
      { ...goal, currentWeightKg },
      anchor,
    ),
    weightChangeKg: change.weightChangeKg,
    weekChangeKg: weightChangeOverDays(weights, currentWeightKg, anchor, 7),
  };
}

export type DashboardFigures = ReturnType<typeof dashboardFigures>;
