import { Skeleton } from '@/components/ui/skeleton';

/**
 * The grid it stands in for, so the four cards don't reflow into a different
 * arrangement once the meals arrive. What `MealsSkeleton` was, reached by the
 * framework instead of by a `status === 'loading'` branch.
 */
export default function MealsLoading() {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex justify-center">
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
