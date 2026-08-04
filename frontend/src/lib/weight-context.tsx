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
  WEIGHT_WINDOW_DAYS,
  isoDaysAgo,
  todayUtc,
  weightAsOf,
  weightChangeOverDays,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Mirrors meals-context.tsx: lifted here (not the dashboard page) so the
// sidebar's "Log weight" trigger shares the same state as the dashboard's
// weight trend chart and "Weight change" stat.
//
// The chart series and change stats are assembled client-side from the weight
// journal (ADR-0005); the projection line needs the goal block, which lives in
// MealsProvider — this provider is nested inside it, so useMeals() is available.
// The journal window every weight figure on the dashboard is drawn from. It is
// the fetch range, not anything the trend card draws: the chart crops its axis
// to the readings themselves, and the card dates its count from the first of
// them rather than from this window.

type FetchStatus = 'loading' | 'error' | 'ready';

type WeightContextValue = {
  status: FetchStatus;
  retry: () => void;
  entries: WeightEntryResponse[];
  /** Current Weight read at the selected Tracking Day, not at this moment. */
  currentWeightKg: number;
  weightTrend: WeightTrendPoint[];
  weightChangeKg: number;
  weightChangeLastMonthKg: number;
  /** Rolling 7-day change; null when the journal doesn't reach back a week. */
  weekChangeKg: number | null;
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
      .list(isoDaysAgo(WEIGHT_WINDOW_DAYS, now), todayUtc(now))
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

  // Use the selected tracking day as "now" so the weight trend and change stat
  // reflect the state at that day, not the current moment.
  const { selectedDate } = useMeals();
  // The *end* of the day, not its noon: an entry recorded this afternoon is on
  // the selected Tracking Day and has to count as its weight. Anchored at noon,
  // a weigh-in logged after 12:00 UTC read as tomorrow's and left the card
  // showing yesterday's figure until the date rolled over.
  const selectedDateAsNow = new Date(`${selectedDate}T23:59:59.999Z`);

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
    // Every figure below is measured *from* this weight, so it is derived once:
    // passing the server's Current Weight instead compared the latest reading
    // against a week before the selected day, and a past day's card read
    // "9.6 kg this week" off two numbers seven months of plan apart.
    const currentWeightKg = goal
      ? weightAsOf(entries, selectedDateAsNow, goal.currentWeightKg)
      : 0;
    const change = goal
      ? computeWeightChange(entries, currentWeightKg, selectedDateAsNow)
      : { weightChangeKg: 0, weightChangeLastMonthKg: 0 };
    return {
      status,
      retry,
      entries,
      currentWeightKg,
      weightTrend: goal
        ? buildWeightTrend(
            entries,
            { ...goal, currentWeightKg },
            selectedDateAsNow,
          )
        : [],
      weightChangeKg: change.weightChangeKg,
      weightChangeLastMonthKg: change.weightChangeLastMonthKg,
      // Here rather than in the dashboard, beside the other two derivations of
      // the same journal: all three have to share one anchor, and the view
      // cannot hold that anchor without also holding this provider's date
      // convention.
      weekChangeKg: goal
        ? weightChangeOverDays(entries, currentWeightKg, selectedDateAsNow, 7)
        : null,
      onWeightSaved,
      onWeightsChanged,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entries,
    goal,
    status,
    retry,
    selectedDate,
    onWeightSaved,
    onWeightsChanged,
  ]);

  return (
    <WeightContext.Provider value={value}>{children}</WeightContext.Provider>
  );
}
