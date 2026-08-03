import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

// One skeleton, shaped to the bands it stands in for, so nothing reflows into
// a different arrangement once the data lands.
export function DashboardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-3.5">
        <Card className="gap-3 p-5 lg:grow-2 lg:basis-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="rounded-full h-2 w-full" />
        </Card>
        <Card className="gap-1.5 rounded-lg px-4.5 py-4 lg:grow lg:basis-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </Card>
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-3.5">
        <div className="flex flex-col gap-2.5 lg:grow lg:basis-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="rounded-xl h-40 w-full lg:h-64" />
        </div>
        <div className="flex flex-col gap-2.5 lg:grow lg:basis-0">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="rounded-xl h-40 w-full lg:h-64" />
        </div>
      </div>
      <Skeleton className="rounded-xl h-56 w-full" />
    </>
  );
}
