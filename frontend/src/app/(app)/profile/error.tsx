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
 * `/profile` reads the signed-in user on the server, so it can fail there and
 * needs a boundary of its own — without one the failure climbs to the global
 * handler and takes the shell with it.
 *
 * Framed like `/meals`: this page stands on the background, not inside a card.
 */
export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <Empty className="w-full max-w-xl rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <Image src="/mascot/recover.webp" alt="" width={56} height={56} />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load your profile</EmptyTitle>
        <EmptyDescription>
          Your plan and details are safe. Try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
