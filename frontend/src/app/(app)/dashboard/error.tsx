'use client';

import { RetryEmpty } from '@/components/retry-empty';

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
    <RetryEmpty
      className="grow basis-0"
      mascotClassName="w-18"
      title="Couldn't load your dashboard"
      description="The numbers are still on the server. Try again."
      onRetry={() => retry()}
    />
  );
}
