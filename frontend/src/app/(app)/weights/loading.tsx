import { Skeleton } from '@/components/ui/skeleton';

/**
 * The route's own shape, so nothing reflows once the window lands. What
 * `WeightsSkeleton` was, plus the range control: it used to render outside the
 * loading branch and stay live while the next window loaded, and stepping the
 * range is a navigation now, so it is replaced along with everything else.
 *
 * The two short cards pair from `lg` exactly as the real ones do. Every height
 * here is measured at 1024 rather than guessed: 84 for the stepper over its
 * preset row, 180 for the stat band, 288 for the chart — its card's own `h-72`.
 *
 * The entry list is the one card a rectangle cannot match, because its height is
 * how many entries the window holds: 184 empty, 314 at three. It gets the empty
 * figure, as the dashboard's meal list does, so the page settles downwards into
 * more content rather than snapping shorter.
 */
export default function WeightsLoading() {
  return (
    <div className="flex w-full flex-col gap-5">
      {/* The stepper over its preset row, the two rectangles the nav stacks. */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-10 w-52 rounded-md" />
        <Skeleton className="h-9 w-64 rounded-md" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-3.5">
        <Skeleton className="h-45 w-full rounded-xl" />
        <Skeleton className="h-45 w-full rounded-xl" />
      </div>

      <Skeleton className="h-72 w-full rounded-xl" />

      <Skeleton className="h-46 w-full rounded-xl" />
    </div>
  );
}
