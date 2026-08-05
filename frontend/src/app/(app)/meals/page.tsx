import type { Metadata } from 'next';
import { DayNav } from '@/components/day-nav';
import { EmptyMeals } from '@/components/empty-meals';
import {
  DAY_PARAM,
  todaysMeals,
  trackingDayFrom,
} from '@/lib/dashboard-transforms';
import { listMeals } from '@/lib/server/reads';
import { requireOnboarded } from '@/lib/server/session';
import { MealGroups } from './meal-groups';

export const metadata: Metadata = {
  title: 'Meals — FoodNote',
};

/**
 * One Tracking Day's meals, grouped by meal time; the day nav steps back through
 * past days. Pagination isn't wired up yet.
 *
 * It had no fetch of its own before — it read `MealsProvider.selectedDayMeals`,
 * which was already exactly this dataset. With the provider gone it reads the one
 * day it draws, which is a narrower request than the dashboard's seven.
 */
export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const selectedDate = trackingDayFrom(
    (await searchParams)[DAY_PARAM],
    new Date(),
  );

  // In parallel, not guard-first: `GET /meals` needs no goal, so waiting on the
  // onboarding read before starting the day's own read cost a serial round trip
  // on every day step — and unlike the dashboard's, this page's read does not
  // 404 without a goal. A redirect still wins: it throws out of the `await`
  // below with the meals request already in flight and unread.
  const [, meals] = await Promise.all([
    requireOnboarded(),
    // Still through `todaysMeals`: the bounds are UTC days, but the order is the
    // page's own — newest first, matching where an optimistic insert puts a meal.
    listMeals(selectedDate, selectedDate).then((list) =>
      todaysMeals(list, selectedDate),
    ),
  ]);

  // No max-width: the shell owns the page frame (#127). The cap this page used
  // to carry is what left 1440 mostly empty beside truncated meal names.
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex justify-center">
        <DayNav selectedDate={selectedDate} />
      </div>

      {meals.length === 0 ? (
        // A border here and not on the dashboard: this one stands on the page
        // with nothing around it, so without an edge the mascot floats in the
        // middle of an empty screen.
        <EmptyMeals className="rounded-lg border border-dashed py-16" />
      ) : (
        <MealGroups meals={meals} />
      )}
    </div>
  );
}
