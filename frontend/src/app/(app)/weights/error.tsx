'use client';

import { RetryEmpty } from '@/components/retry-empty';

/**
 * What `WeightsError` was — a centred line of text and a button — reached by the
 * framework instead of by a `status === 'error'` branch.
 *
 * `retry()`, not `reset()`: only `retry` refreshes the router before clearing the
 * error, which is what re-runs the read. `reset()` alone re-renders the same
 * failed payload (`node_modules/next/dist/client/components/error-boundary.js`).
 *
 * Framed like /meals' and unlike the dashboard's: this page stands on the
 * background with nothing around it, so without an edge the mascot floats in the
 * middle of an empty screen.
 */
export default function WeightsError({ retry }: { retry: () => void }) {
  return (
    <RetryEmpty
      className="rounded-lg border border-dashed"
      title="Couldn't load your weight history"
      description="Every weigh-in is still there. Try again."
      onRetry={() => retry()}
    />
  );
}
