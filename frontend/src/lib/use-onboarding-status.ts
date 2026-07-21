'use client';

import { useEffect, useState } from 'react';
import { ApiError, goals } from '@/lib/api-client';

export type OnboardingStatus = 'loading' | 'onboarded' | 'not-onboarded';

/**
 * Derived onboarding state. The contract designates `GET /goals/current` 404 as
 * the "onboarding not complete" signal (an active goal is the last of the three
 * onboarding calls), so completion is derived on read, never stored.
 *
 * NOTE: the backend does not serve `/goals/current` yet, so today the request
 * 404s and every user is treated as not-onboarded. To test the onboarded path
 * before the backend lands, temporarily `return 'onboarded';` at the top.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [status, setStatus] = useState<OnboardingStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    goals
      .current()
      .then(() => {
        if (!cancelled) setStatus('onboarded');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(
          err instanceof ApiError && err.status === 404
            ? 'not-onboarded'
            : 'onboarded',
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
