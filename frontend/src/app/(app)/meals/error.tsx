'use client';

import Image from 'next/image';
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
 * What `MealsError` was; `reset()` re-runs the read the old `retry()` re-ran.
 *
 * Framed, unlike the dashboard's: this page stands on the background with
 * nothing around it, so without an edge the mascot floats in the middle of an
 * empty screen — the same reason `EmptyMeals` asks for a border here.
 */
export default function MealsError({ reset }: { reset: () => void }) {
  return (
    <Empty className="rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <Image src="/mascot/recover.webp" alt="" width={56} height={56} />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load your meals</EmptyTitle>
        <EmptyDescription>The day is still there. Try again.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
