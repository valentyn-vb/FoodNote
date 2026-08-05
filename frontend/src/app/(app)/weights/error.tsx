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
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <Mascot src="/mascot/recover.webp" className="w-14" priority />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load your weight history</EmptyTitle>
        <EmptyDescription>
          Every weigh-in is still there. Try again.
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
