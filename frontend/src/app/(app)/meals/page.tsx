'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DayNav } from '@/components/day-nav';
import { EmptyState } from '@/components/empty-state';
import { MealGroupsAccordion } from '@/components/meal-groups-accordion';
import { MealLogDrawer } from '@/components/meal-log-drawer';
import { useMeals } from '@/lib/meals-context';
import { DesktopMealGroups } from './desktop-meal-groups';

// One Tracking Day's meals, grouped by meal time; the day nav steps back
// through past days. Editing a logged meal isn't wired up yet (PATCH
// /meals/:id exists, no UI uses it), and neither is pagination.
//
// No fetch of its own: this route sits inside MealsProvider, whose
// `selectedDayMeals` is already exactly this page's dataset and whose
// `selectedDate` the dashboard shares. useDashboardGate is deliberately not
// reused — it also gates on the weight journal and goal block, neither of
// which this page renders.
export default function MealsPage() {
  const { status, retry, selectedDayMeals } = useMeals();

  return (
    <div className="flex w-full flex-col gap-5  lg:max-w-6xl">
      {/* Mobile only: at lg+ the shell's own AppHeader carries the title and
          the "Log a meal" trigger for every route. */}
      <div className="flex items-center gap-2 lg:hidden">
        {/* The sidebar is desktop-only, so on mobile this is the only way back
            out of the page (there is no mobile nav to /meals yet either). */}
        <Link href="/dashboard" aria-label="Back to dashboard">
          <ChevronLeft size={20} className="shrink-0" strokeWidth={1.8} />
        </Link>
        <h1 className="font-heading text-2xl font-semibold">Meals</h1>
        {/* Logging is reachable from here too, not just the dashboard — this is
            the page you land on to review the day. A compact header button,
            not the full-width one the mobile action bar uses. */}
        <MealLogDrawer
          trigger={
            <Button size="lg" className="ml-auto px-8">
              Log a meal
            </Button>
          }
        />
      </div>

      {/* Its own row: the header already clips between the sidebar and ~1400px (#112). */}
      <div className="flex justify-center lg:justify-start">
        <DayNav />
      </div>

      {status === 'error' ? (
        <MealsError onRetry={retry} />
      ) : status === 'loading' ? (
        <MealsSkeleton />
      ) : selectedDayMeals.length === 0 ? (
        <EmptyState
          mascotSrc="/mascot/accompany.webp"
          caption="Nothing logged yet — your first meal starts the day."
          className="py-16"
        />
      ) : (
        <>
          {/* The accordion owns no breakpoint of its own (the dashboards use it
              at every width), so the mobile-only scoping lives here. */}
          <div className="lg:hidden">
            <MealGroupsAccordion meals={selectedDayMeals} />
          </div>
          <DesktopMealGroups meals={selectedDayMeals} />
        </>
      )}
    </div>
  );
}

function MealsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span className="text-sm text-muted-foreground">
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
