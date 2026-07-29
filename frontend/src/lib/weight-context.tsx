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
  entries: WeightEntryResponse[];
  weightTrend: WeightTrendPoint[];
  weightChangeKg: number;
  weightChangeLastMonthKg: number;
  onWeightSaved: (entry: WeightEntryResponse) => void;
  onWeightsChanged: () => void;
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
      // projected date (POST /weights doesn't return it). The reached-goal
      // overlay is triggered by reachedTarget on the dashboard and is
      // non-dismissable, so no client state needed.
      setEntries((prev) => [...prev, entry]);
      void refetchDashboard();
    },
    [refetchDashboard],
  );

  // Edits and deletes re-list rather than patching locally, so the client
  // never holds a view the server disagrees with. That also fixes a real bug:
  // an edit can move an entry's recordedAt outside this provider's 60-day
  // window, and a local patch would keep showing it while the server-derived
  // goal block excluded it. Bumping reloadKey refetches without setting
  // 'loading', so no skeleton flashes.
  //
  // onWeightSaved above stays optimistic on purpose: it appends at `now`,
  // which can never fall outside the window, and the save toast's NumberFlow
  // animation depends on the number moving immediately.
  const onWeightsChanged = useCallback(() => {
    setReloadKey((k) => k + 1);
    void refetchDashboard();
  }, [refetchDashboard]);

  const value = useMemo<WeightContextValue>(() => {
    const change = goal
      ? computeWeightChange(entries, goal.currentWeightKg, new Date())
      : { weightChangeKg: 0, weightChangeLastMonthKg: 0 };
    return {
      status,
      retry,
      entries,
      weightTrend: goal ? buildWeightTrend(entries, goal, new Date()) : [],
      weightChangeKg: change.weightChangeKg,
      weightChangeLastMonthKg: change.weightChangeLastMonthKg,
      onWeightSaved,
      onWeightsChanged,
    };
  }, [entries, goal, status, retry, onWeightSaved, onWeightsChanged]);

  return (
    <WeightContext.Provider value={value}>{children}</WeightContext.Provider>
  );
}
