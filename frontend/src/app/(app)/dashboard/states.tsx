import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Shown when GET /dashboard fails — the tiles are the backbone, so without
// them the whole view is unusable. Retry re-runs both the dashboard and the
// weight fetches.
export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex grow basis-0 flex-col items-center justify-center gap-4 py-16">
      <Image src="/mascot/recover.webp" alt="" width={72} height={72} />
      <p className="max-w-64 text-center text-sm text-muted-foreground">
        Couldn&apos;t load your dashboard.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// Compact inline failure for the weight sections — a weight-fetch failure
// shouldn't take down the whole dashboard, so it stays local to its card.
export function InlineError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-4">
      <p className="text-sm text-muted-foreground">
        Couldn&apos;t load weight data.
      </p>
      <Button variant="link" className="h-auto gap-1 p-0" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

// One plain rectangle per card, in the same three bands and at the heights the
// cards settle to, so the page doesn't re-lay-out when the data lands.
//
// The stat rectangle is 180 from `md` up, where the four cards share a row and
// stretch to the tallest of them, and 176 on a phone, where they stack and keep
// their own heights (164–180). Measured, not guessed: the bands come out equal
// at 1440 and within 4–5px at every other step.
//
// The meal list is the one card a rectangle cannot match, because its height is
// the data — 251 empty, taller with meals logged. It gets the same 288 as the
// ring beside it, which is what an empty day settles to in that row.
export function DashboardSkeleton() {
  return (
    <>
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
    </>
  );
}
