'use client';

import { RetryEmpty } from '@/components/retry-empty';

/**
 * What `MealsError` was; `retry()` re-runs the read the old `retry()` re-ran.
 *
 * Framed, unlike the dashboard's: this page stands on the background with
 * nothing around it, so without an edge the mascot floats in the middle of an
 * empty screen — the same reason `EmptyMeals` asks for a border here.
 */
export default function MealsError({ retry }: { retry: () => void }) {
  return (
    <RetryEmpty
      className="rounded-lg border border-dashed"
      title="Couldn't load your meals"
      description="The day is still there. Try again."
      onRetry={() => retry()}
    />
  );
}
