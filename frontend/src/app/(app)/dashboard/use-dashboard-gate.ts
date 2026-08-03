'use client';

import type { DashboardResponse } from '@foodnote/shared';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';

/**
 * The single place the dashboard decides whether it can render: the error, the
 * skeleton and the six blocks are the three states of one tree (ADR-0011).
 *
 * A discriminated union rather than a bag of fields, so `goal` is known
 * non-null in the 'ready' state and the layout needs no second null check.
 */
export type DashboardGate =
  | { state: 'error'; retryAll: () => void }
  | { state: 'loading' }
  | { state: 'ready'; goal: DashboardResponse['goal'] };

export function useDashboardGate(): DashboardGate {
  const { status, retry, goal } = useMeals();
  const { retry: retryWeight } = useWeight();

  if (status === 'error') {
    // The whole-dashboard error retries both fetches; the weight card keeps its
    // own inline retry for when only the weight journal failed.
    return {
      state: 'error',
      retryAll: () => {
        retry();
        retryWeight();
      },
    };
  }
  // No goal block means onboarding data hasn't arrived yet — not renderable,
  // even though the fetch itself reported ready.
  if (status === 'loading' || !goal) return { state: 'loading' };
  return { state: 'ready', goal };
}
