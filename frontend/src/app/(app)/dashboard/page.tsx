import {
  DAY_PARAM,
  WEIGHT_WINDOW_DAYS,
  isoDaysAgo,
  todayUtc,
  trackingDayFrom,
} from '@/lib/dashboard-transforms';
import { getDashboard, listMeals, listWeights } from '@/lib/server/reads';
import { requireOnboarded } from '@/lib/server/session';
import { Dashboard } from './dashboard';
import { dashboardFigures } from './figures';

/**
 * Three reads in parallel, and every figure derived before the first byte of
 * HTML. There is no client cache to go stale, so there is nothing for a mutation
 * to invalidate by hand — a write revalidates this page, and the numbers move
 * together because they were all computed from one pass over one set of
 * responses.
 *
 * `requireOnboarded()` stands where `useDashboardGate`'s "no goal block means not
 * renderable" branch did. It costs no extra round trip: it reads the memoized
 * goal the target overlay wants anyway.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const now = new Date();
  const selectedDate = trackingDayFrom((await searchParams)[DAY_PARAM], now);

  await requireOnboarded();

  const anchor = new Date(`${selectedDate}T00:00:00Z`);

  const [dashboard, meals, weights] = await Promise.all([
    getDashboard(selectedDate),
    // Seven days ending at the selected day: the day's own list and the weekly
    // chart come out of one read.
    listMeals(isoDaysAgo(6, anchor), selectedDate),
    // The journal window is anchored at *today*, not at the selected day — the
    // trend line and the month change describe the plan to date, and stepping
    // back a day should not shorten them.
    listWeights(isoDaysAgo(WEIGHT_WINDOW_DAYS, now), todayUtc(now)),
  ]);

  return (
    <Dashboard
      selectedDate={selectedDate}
      {...dashboardFigures({ dashboard, meals, weights, now })}
    />
  );
}
