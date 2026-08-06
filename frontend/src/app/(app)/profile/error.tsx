'use client';

import { RetryEmpty } from '@/components/retry-empty';

/**
 * `/profile` reads the signed-in user on the server, so it can fail there and
 * needs a boundary of its own — without one the failure climbs to the global
 * handler and takes the shell with it.
 *
 * Framed like `/meals`: this page stands on the background, not inside a card.
 */
export default function ProfileError({ retry }: { retry: () => void }) {
  return (
    <RetryEmpty
      className="w-full max-w-xl rounded-lg border border-dashed"
      title="Couldn't load your profile"
      description="Your plan and details are safe. Try again."
      onRetry={() => retry()}
    />
  );
}
