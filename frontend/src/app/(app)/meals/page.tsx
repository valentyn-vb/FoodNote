'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { useMeals } from '@/lib/meals-context';
import { DesktopMealGroups } from './desktop-meal-groups';
import { MobileMealGroups } from './mobile-meal-groups';
import { groupMealsByType } from './helpers';

// Today's meals, grouped by meal time. Read-only: logging still happens through
// the drawer, and editing a past meal isn't wired up yet (PATCH /meals/:id
// exists, no UI uses it). A date picker and pagination are a later ticket —
// GET /meals already takes from/to bounds, so that stays frontend-only.
//
// No fetch of its own: this route sits inside MealsProvider, whose `todayMeals`
// is already exactly this page's dataset (one Tracking Day). useDashboardGate is
// deliberately not reused — it also gates on the weight journal and goal block,
// neither of which this page renders.
export default function MealsPage() {
  const { status, retry, todayMeals } = useMeals();
  const groups = groupMealsByType(todayMeals);

  return (
    <div className="flex w-full flex-col gap-5 px-5 pt-6 pb-8 lg:mx-14 lg:my-10 lg:max-w-6xl lg:px-0 lg:py-0">
      <div className="flex items-center gap-2">
        {/* The sidebar is desktop-only, so on mobile this is the only way back
            out of the page (there is no mobile nav to /meals yet either). */}
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          className="lg:hidden"
        >
          <ChevronLeft
            size={20}
            className="shrink-0 text-text"
            strokeWidth={1.8}
          />
        </Link>
        <h1 className="font-display text-heading-lg font-semibold text-text">
          Meals
        </h1>
        {/* Logging is reachable from here too, not just the dashboard — this is
            the page you land on to review the day. The drawer's own trigger
            defaults stretch to fill a mobile action bar, so the grow/basis
            reset keeps it a compact header button on both breakpoints. */}
        <MealLogDrawer triggerClassName="ml-auto h-10 grow-0 basis-auto px-5 text-label font-semibold" />
      </div>

      {status === 'error' ? (
        <MealsError onRetry={retry} />
      ) : status === 'loading' ? (
        <MealsSkeleton />
      ) : todayMeals.length === 0 ? (
        <EmptyState
          mascotSrc="/mascot/accompany.webp"
          caption="Nothing logged yet — your first meal starts the day."
          className="py-16"
        />
      ) : (
        <>
          <MobileMealGroups groups={groups} />
          <DesktopMealGroups groups={groups} />
        </>
      )}
    </div>
  );
}

function MealsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="font-sans text-caption text-text-muted">
        Couldn&apos;t load your meals.
      </span>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// Shaped to each layout's own arrangement, so the skeleton doesn't reflow into
// something different once the meals arrive.
function MealsSkeleton() {
  return (
    <>
      {/* Mobile is one card of four collapsed rows, so it gets one block. */}
      <Skeleton className="h-56 w-full rounded-lg lg:hidden" />
      <div className="hidden grid-cols-2 gap-3.5 lg:grid xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
    </>
  );
}
