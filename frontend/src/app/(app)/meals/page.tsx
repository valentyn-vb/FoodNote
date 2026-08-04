'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DayNav } from '@/components/day-nav';
import { EmptyMeals } from '@/components/empty-meals';
import { useMeals } from '@/lib/meals-context';
import { MealGroups } from './meal-groups';

// One Tracking Day's meals, grouped by meal time; the shell's day nav steps back
// through past days. Pagination isn't wired up yet.
//
// No fetch of its own: this route sits inside MealsProvider, whose
// `selectedDayMeals` is already exactly this page's dataset and whose
// `selectedDate` the dashboard shares. useDashboardGate is deliberately not
// reused — it also gates on the weight journal and goal block, neither of
// which this page renders.
export default function MealsPage() {
  const { status, retry, selectedDayMeals } = useMeals();

  // No max-width: the shell owns the page frame (#127). The cap this page used
  // to carry is what left 1440 mostly empty beside truncated meal names.
  return (
    <div className="flex w-full flex-col gap-5">
      {/* Outside the status branch: the day can be stepped while the day it
          stepped to is loading or has failed. */}
      <div className="flex justify-center">
        <DayNav />
      </div>

      {status === 'error' ? (
        <MealsError onRetry={retry} />
      ) : status === 'loading' ? (
        <MealsSkeleton />
      ) : selectedDayMeals.length === 0 ? (
        // A border here and not on the dashboard: this one stands on the page
        // with nothing around it, so without an edge the mascot floats in the
        // middle of an empty screen.
        <EmptyMeals className="rounded-lg border border-dashed py-16" />
      ) : (
        <MealGroups meals={selectedDayMeals} />
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

// The grid it stands in for, so the four cards don't reflow into a different
// arrangement once the meals arrive.
function MealsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-lg" />
      ))}
    </div>
  );
}
