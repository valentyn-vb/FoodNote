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
import Image from 'next/image';
import { toast } from 'sonner';
import type {
  CreateMealRequest,
  DashboardResponse,
  MealResponse,
} from '@foodnote/shared';
import { dashboard as dashboardApi, meals as mealsApi } from '@/lib/api-client';
import {
  bucketDailyCalories,
  isoDaysAgo,
  todayUtc,
  todaysMeals,
  type DailyCaloriePoint,
} from '@/lib/dashboard-transforms';

// Lifted out of the dashboard page so the sidebar's "Log a meal" trigger (a
// sibling in the shared (app) layout, not a child of the dashboard) shares the
// same meals state — otherwise it saves into a void nothing reads.
//
// The tile numbers come from GET /dashboard (the thin read model, ADR-0005),
// never derived from the meals list; the meals list + 7-day chart come from
// one GET /meals covering the last 7 days.
type FetchStatus = 'loading' | 'error' | 'ready';

type GoalBlock = DashboardResponse['goal'];

type MealsContextValue = {
  status: FetchStatus;
  retry: () => void;
  eatenKcal: number;
  remainingKcal: number;
  progressPct: number;
  goalKcal: number;
  goal: GoalBlock | null;
  todayMeals: MealResponse[];
  dailyCalories: DailyCaloriePoint[];
  saveMeal: (draft: CreateMealRequest) => void;
  // Weight saves recompute the goal block server-side (projected date depends
  // on the new weight), so WeightProvider — nested inside this one — calls this
  // after POST /weights to refresh the goal tile and the chart's projection.
  refetchDashboard: () => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within MealsProvider');
  return ctx;
}

// A meal save/undo only ever shifts today's totals — it never touches the goal
// block or weight — so we apply the exact delta locally instead of refetching
// (the server stores the totals we send verbatim, ADR-0005).
function applyMealDelta(
  dashboard: DashboardResponse,
  meal: Pick<
    MealResponse,
    'totalCalories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'
  >,
  sign: 1 | -1,
): DashboardResponse {
  return {
    ...dashboard,
    today: {
      ...dashboard.today,
      totalCalories: dashboard.today.totalCalories + sign * meal.totalCalories,
      proteinGrams: dashboard.today.proteinGrams + sign * meal.proteinGrams,
      carbsGrams: dashboard.today.carbsGrams + sign * meal.carbsGrams,
      fatGrams: dashboard.today.fatGrams + sign * meal.fatGrams,
      mealsLogged: Math.max(0, dashboard.today.mealsLogged + sign),
    },
  };
}

export function MealsProvider({ children }: { children: ReactNode }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [meals, setMeals] = useState<MealResponse[]>([]);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  // Same shape as AuthProvider's session restore: the fetch lives inside the
  // effect as a promise chain with a cancelled flag, so setState only ever
  // runs from the .then/.catch callbacks (not synchronously in the effect).
  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    Promise.all([
      dashboardApi.current(),
      mealsApi.list(isoDaysAgo(6, now), todayUtc(now)),
    ])
      .then(([dash, list]) => {
        if (cancelled) return;
        setDashboard(dash);
        setMeals(list);
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

  const refetchDashboard = useCallback(async () => {
    try {
      setDashboard(await dashboardApi.current());
    } catch {
      // The weight was still saved; leave the prior goal block until reload.
    }
  }, []);

  // Bound to the created meal (not just its id) so no render-time ref is needed
  // to recover the totals for the delta + rollback.
  const undoMeal = useCallback((meal: MealResponse) => {
    setMeals((prev) => prev.filter((m) => m.id !== meal.id));
    setDashboard((d) => (d ? applyMealDelta(d, meal, -1) : d));
    mealsApi.remove(meal.id).catch(() => {
      setMeals((prev) => [meal, ...prev]);
      setDashboard((d) => (d ? applyMealDelta(d, meal, 1) : d));
      toast.error("Couldn't undo — your meal is still saved.");
    });
  }, []);

  const saveMeal = useCallback(
    (draft: CreateMealRequest) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: MealResponse = {
        id: tempId,
        mealName: draft.mealName,
        mealType: draft.mealType,
        recordedAt: draft.recordedAt,
        totalCalories: draft.totalCalories,
        proteinGrams: draft.proteinGrams,
        carbsGrams: draft.carbsGrams,
        fatGrams: draft.fatGrams,
        source: draft.source,
        items: draft.items ?? [],
      };
      // Optimistic: bump the tiles and show the meal immediately so NumberFlow
      // animates now, not after the round trip.
      setMeals((prev) => [optimistic, ...prev]);
      setDashboard((d) => (d ? applyMealDelta(d, draft, 1) : d));

      mealsApi
        .create(draft)
        .then((created) => {
          setMeals((prev) => prev.map((m) => (m.id === tempId ? created : m)));
          // CELEBRATE mascot moment (design doc: quiet, it happens every meal).
          toast.success('Meal saved', {
            icon: (
              <Image
                src="/mascot/celebrate.webp"
                alt=""
                width={24}
                height={24}
              />
            ),
            action: { label: 'Undo', onClick: () => undoMeal(created) },
          });
        })
        .catch(() => {
          setMeals((prev) => prev.filter((m) => m.id !== tempId));
          setDashboard((d) => (d ? applyMealDelta(d, draft, -1) : d));
          toast.error("Couldn't save your meal. Please try again.");
        });
    },
    [undoMeal],
  );

  const value = useMemo<MealsContextValue>(() => {
    const goalKcal = dashboard?.calorieTarget ?? 0;
    const eatenKcal = dashboard?.today.totalCalories ?? 0;
    const now = new Date();
    return {
      status,
      retry,
      eatenKcal,
      goalKcal,
      remainingKcal: Math.max(0, goalKcal - eatenKcal),
      progressPct:
        goalKcal > 0
          ? Math.min(100, Math.round((eatenKcal / goalKcal) * 100))
          : 0,
      goal: dashboard?.goal ?? null,
      todayMeals: dashboard ? todaysMeals(meals, dashboard.date) : [],
      dailyCalories: bucketDailyCalories(meals, now),
      saveMeal,
      refetchDashboard,
    };
  }, [dashboard, meals, status, retry, saveMeal, refetchDashboard]);

  return (
    <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
  );
}
