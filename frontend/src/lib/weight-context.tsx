'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { WeightEntryResponse } from '@foodnote/shared';
import { weights as weightsApi } from '@/lib/api-client';
import { useMeals } from '@/lib/meals-context';
import {
  buildWeightTrend,
  computeWeightChange,
  isoDaysAgo,
  todayUtc,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Mirrors meals-context.tsx: lifted here (not the dashboard page) so the
// sidebar's "Log weight" trigger shares the same state as the dashboard's
// weight trend chart and "Weight change" stat.
//
// The chart series and change stats are assembled client-side from the weight
// journal (ADR-0005); the projection line needs the goal block, which lives in
// MealsProvider — this provider is nested inside it, so useMeals() is available.
// A 60-day window covers both the ~6-week chart and the "Last month" comparison.
type FetchStatus = 'loading' | 'error' | 'ready';

type WeightContextValue = {
  status: FetchStatus;
  retry: () => void;
  weightTrend: WeightTrendPoint[];
  weightChangeKg: number;
  weightChangeLastMonthKg: number;
  onWeightSaved: (entry: WeightEntryResponse) => void;
  // True for the one render pass after a logged weight met the goal. Drives the
  // celebration overlay mounted in the (app) layout, which is the only place
  // both "Log weight" triggers (sidebar on desktop, dashboard on mobile) share.
  celebrating: boolean;
  dismissCelebration: () => void;
};

const WeightContext = createContext<WeightContextValue | null>(null);

export function useWeight() {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used within WeightProvider');
  return ctx;
}

export function WeightProvider({ children }: { children: ReactNode }) {
  const { goal, refetchDashboard } = useMeals();
  const [entries, setEntries] = useState<WeightEntryResponse[]>([]);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  // Fetch as a promise chain inside the effect (cancelled flag), matching
  // AuthProvider — setState runs only from the .then/.catch callbacks.
  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    weightsApi
      .list(isoDaysAgo(60, now), todayUtc(now))
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  }, []);

  const onWeightSaved = useCallback(
    (entry: WeightEntryResponse) => {
      // The new entry updates the actual line + change stat immediately; the
      // projection line + goal tile re-anchor once the server recomputes the
      // projected date (POST /weights doesn't return it).
      setEntries((prev) => [...prev, entry]);

      // Celebrate the transition, not the state: the goal block we already hold
      // is the "before", the refetch is the "after". That makes this fire once —
      // logging again while still at target sees reachedTarget already true — and
      // it needs nothing stored server-side. Defaulting the unknown case to true
      // means a cold or failed read stays quiet rather than firing spuriously.
      const wasReached = goal?.reachedTarget ?? true;
      void refetchDashboard().then((next) => {
        if (!wasReached && next?.goal.reachedTarget) setCelebrating(true);
      });
    },
    [goal, refetchDashboard],
  );

  const dismissCelebration = useCallback(() => setCelebrating(false), []);

  const value = useMemo<WeightContextValue>(() => {
    const change = goal
      ? computeWeightChange(entries, goal.currentWeightKg, new Date())
      : { weightChangeKg: 0, weightChangeLastMonthKg: 0 };
    return {
      status,
      retry,
      weightTrend: goal ? buildWeightTrend(entries, goal, new Date()) : [],
      weightChangeKg: change.weightChangeKg,
      weightChangeLastMonthKg: change.weightChangeLastMonthKg,
      onWeightSaved,
      celebrating,
      dismissCelebration,
    };
  }, [
    entries,
    goal,
    status,
    retry,
    onWeightSaved,
    celebrating,
    dismissCelebration,
  ]);

  return (
    <WeightContext.Provider value={value}>{children}</WeightContext.Provider>
  );
}
