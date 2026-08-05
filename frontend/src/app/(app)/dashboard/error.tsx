'use client';

import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * What `DashboardError` was, on upstream's Empty primitives and reached the way
 * the framework reaches it. The tiles are the backbone, so a failed read leaves
 * the whole view unusable and the page says so rather than drawing half of it.
 *
 * `retry()`, not `reset()`: the two are different in this version and only
 * `retry` refreshes the router before clearing the error, which is what re-runs
 * the three server reads — the same job the old `retryAll` did by calling two
 * providers' `retry()` in turn, minus the wiring that had to know there were two.
 * `reset()` alone only drops the boundary's error state, so the failed read is
 * re-rendered rather than re-attempted
 * (`node_modules/next/dist/client/components/error-boundary.js`).
 *
 * A dead session never arrives here: `serverFetch` redirects to `/login` on a
 * 401 rather than throwing, so this really is "the read failed", not "you are
 * signed out".
 */
export default function DashboardError({ retry }: { retry: () => void }) {
  return (
    // No `border`, so upstream's `border-dashed` draws nothing: this stands in
    // for the whole page, where a dashed frame around a failure reads as a
    // placeholder for something still coming.
    <Empty className="grow basis-0">
      <EmptyHeader>
        <EmptyMedia>
          {/* RECOVER mascot moment: the one place the app admits a fault. */}
          <Mascot src="/mascot/recover.webp" className="w-18" priority />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load your dashboard</EmptyTitle>
        <EmptyDescription>
          The numbers are still on the server. Try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={() => retry()}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
