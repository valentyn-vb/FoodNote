import { Skeleton } from '@/components/ui/skeleton';

/**
 * The route's own shape, not a centred spinner — and it paints instantly, because
 * this boundary sits *inside* `(app)/layout.tsx`: the sidebar and the header are
 * already there while only the page content is standing in.
 *
 * One plain rectangle per card, in the same three bands and at the heights the
 * cards settle to, so the page doesn't re-lay-out when the data lands.
 *
 * The stat rectangle is 180 from `md` up, where the four cards share a row and
 * stretch to the tallest of them, and 176 on a phone, where they stack and keep
 * their own heights (164–180). Measured, not guessed: the bands come out equal at
 * 1440 and within 4–5px at every other step.
 *
 * The meal list is the one card a rectangle cannot match, because its height is
 * the data — 251 empty, taller with meals logged. It gets the same 288 as the
 * ring beside it, which is what an empty day settles to in that row.
 */
export default function DashboardLoading() {
  return (
    <div className="flex grow flex-col gap-5 lg:gap-4">
      {/* The day switcher gets a rectangle of its own now. It used to render
          outside the gate, so it stayed live while the day it stepped to loaded;
          stepping the day is a navigation now, so it is replaced along with
          everything else. */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      {/* Two pairs, matching the real band exactly — see Dashboard for why the
          column count is 1, 2 or 4 and never 3. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(30rem,100%),1fr))] gap-5 lg:gap-3.5">
        <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
          <Skeleton className="h-44 w-full rounded-xl md:h-45" />
          <Skeleton className="h-44 w-full rounded-xl md:h-45" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
          <Skeleton className="h-44 w-full rounded-xl md:h-45" />
          <Skeleton className="h-44 w-full rounded-xl md:h-45" />
        </div>
      </div>

      {/* The meal list beside the ring: two thirds against one from `lg`,
          matching the real band. */}
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-3.5">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>

      {/* The two week-scale charts. */}
      <div className="grid gap-5 md:grid-cols-2 lg:gap-3.5">
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}
