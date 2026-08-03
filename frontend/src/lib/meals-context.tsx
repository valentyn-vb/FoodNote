'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type {
  CreateMealRequest,
  DashboardResponse,
  MealResponse,
  UpdateMealRequest,
} from '@foodnote/shared';
import { dashboard as dashboardApi, meals as mealsApi } from '@/lib/api-client';
import {
  bucketDailyCalories,
  isoDaysAgo,
  isFutureDay,
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
  /** The tracking day currently displayed, as UTC 'YYYY-MM-DD'. */
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  /** True when selectedDate equals today UTC — gates meal logging and labels. */
  isToday: boolean;
  eatenKcal: number;
  /** Target minus eaten — negative once the day goes over budget. */
  remainingKcal: number;
  progressPct: number;
  goalKcal: number;
  /** The day's macro totals, straight from the read model — never re-summed
      from the meal list, whose items may legitimately disagree with it. */
  macros: Pick<
    DashboardResponse['today'],
    'proteinGrams' | 'carbsGrams' | 'fatGrams'
  >;
  // Maintenance energy at the current weight — what the target becomes on a
  // maintenance plan. Null until the dashboard has loaded.
  maintenanceKcal: number | null;
  goal: GoalBlock | null;
  selectedDayMeals: MealResponse[];
  dailyCalories: DailyCaloriePoint[];
  /** Logs onto `day` (UTC 'YYYY-MM-DD'); omitted, onto the day being viewed. */
  saveMeal: (draft: CreateMealRequest, day?: string) => void;
  deleteMeal: (meal: MealResponse) => void;
  /** Patches a meal in place. Its recordedAt and source are never touched, so
      an edit can't move a meal to another day or rewrite its provenance. */
  updateMeal: (meal: MealResponse, patch: UpdateMealRequest) => void;
  // Weight saves recompute the goal block server-side (projected date and
  // reachedTarget both depend on the new weight), so WeightProvider — nested
  // inside this one — calls this after POST /weights to refresh the goal tile
  // and the chart's projection. It resolves with the fresh response (null if the
  // refetch failed) so the caller can compare against the pre-save goal block
  // instead of racing this provider's state.
  refetchDashboard: () => Promise<DashboardResponse | null>;
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
  const [selectedDate, setSelectedDateState] = useState(() =>
    todayUtc(new Date()),
  );
  // Stable ref so refetchDashboard never has to be recreated when the date
  // changes (WeightProvider's onWeightSaved holds a reference to it).
  const selectedDateRef = useRef(selectedDate);

  const setSelectedDate = useCallback((date: string) => {
    // Reject future dates — the API has no data for them.
    if (isFutureDay(date, new Date())) return;
    setStatus('loading');
    setSelectedDateState(date);
    selectedDateRef.current = date;
  }, []);

  // Same shape as AuthProvider's session restore: the fetch lives inside the
  // effect as a promise chain with a cancelled flag, so setState only ever
  // runs from the .then/.catch callbacks (not synchronously in the effect).
  useEffect(() => {
    let cancelled = false;
    // 7-day window ending at the selected tracking day (UTC).
    const anchor = new Date(`${selectedDate}T00:00:00Z`);
    Promise.all([
      dashboardApi.current(selectedDate),
      mealsApi.list(isoDaysAgo(6, anchor), selectedDate),
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
  }, [reloadKey, selectedDate]);

  const retry = useCallback(() => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  }, []);

  const refetchDashboard = useCallback(async () => {
    try {
      const next = await dashboardApi.current(selectedDateRef.current);
      setDashboard(next);
      return next;
    } catch {
      // The weight was still saved; leave the prior goal block until reload.
      return null;
    }
  }, []);

  // One optimistic DELETE behind both entry points — a meal line's trash
  // control and the save toast's Undo. They differ only in what a failed round
  // trip should say, since "couldn't undo" and "couldn't delete" are different
  // news. Bound to the whole meal (not just its id) so no render-time ref is
  // needed to recover the totals for the delta + rollback.
  const removeMeal = useCallback((meal: MealResponse, failure: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== meal.id));
    setDashboard((d) => (d ? applyMealDelta(d, meal, -1) : d));
    mealsApi.remove(meal.id).catch(() => {
      setMeals((prev) => [meal, ...prev]);
      setDashboard((d) => (d ? applyMealDelta(d, meal, 1) : d));
      toast.error(failure);
    });
  }, []);

  const undoMeal = useCallback(
    (meal: MealResponse) =>
      removeMeal(meal, "Couldn't undo — your meal is still saved."),
    [removeMeal],
  );

  const deleteMeal = useCallback(
    (meal: MealResponse) =>
      removeMeal(meal, "Couldn't delete your meal. Please try again."),
    [removeMeal],
  );

  const updateMeal = useCallback(
    (meal: MealResponse, patch: UpdateMealRequest) => {
      mealsApi
        .update(meal.id, patch)
        .then((saved) => {
          setMeals((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
          refetchDashboard();
        })
        .catch(() =>
          toast.error("Couldn't save your changes. Please try again."),
        );
    },
    [refetchDashboard],
  );

  const saveMeal = useCallback(
    (draft: CreateMealRequest, day?: string) => {
      // Only the day part of the drawer's `new Date()` stamp is replaced — the
      // time of day is what orders meals inside a Tracking Day.
      const trackingDay = day ?? selectedDateRef.current;
      const meal: CreateMealRequest = {
        ...draft,
        recordedAt: `${trackingDay}T${draft.recordedAt.slice(11)}`,
      };
      // The saved meal only enters the list once the server has given it an id,
      // so nothing in the UI is ever holding a meal that doesn't exist yet.
      mealsApi
        .create(meal)
        .then((created) => {
          setMeals((prev) => [created, ...prev]);
          refetchDashboard();
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
        .catch(() => toast.error("Couldn't save your meal. Please try again."));
    },
    [undoMeal, refetchDashboard],
  );

  const value = useMemo<MealsContextValue>(() => {
    const goalKcal = dashboard?.calorieTarget ?? 0;
    const eatenKcal = dashboard?.today.totalCalories ?? 0;
    return {
      status,
      retry,
      selectedDate,
      setSelectedDate,
      isToday: selectedDate === todayUtc(new Date()),
      eatenKcal,
      goalKcal,
      maintenanceKcal: dashboard?.maintenanceCalories ?? null,
      macros: {
        proteinGrams: dashboard?.today.proteinGrams ?? 0,
        carbsGrams: dashboard?.today.carbsGrams ?? 0,
        fatGrams: dashboard?.today.fatGrams ?? 0,
      },
      // Signed: a day over budget is a number the dashboard states, not one it
      // floors away. progressPct below stays clamped — the bar fills once.
      remainingKcal: goalKcal - eatenKcal,
      progressPct:
        goalKcal > 0
          ? Math.min(100, Math.round((eatenKcal / goalKcal) * 100))
          : 0,
      goal: dashboard?.goal ?? null,
      selectedDayMeals: dashboard ? todaysMeals(meals, dashboard.date) : [],
      dailyCalories: dashboard
        ? bucketDailyCalories(meals, dashboard.date)
        : [],
      saveMeal,
      deleteMeal,
      updateMeal,
      refetchDashboard,
    };
  }, [
    dashboard,
    meals,
    status,
    retry,
    selectedDate,
    setSelectedDate,
    saveMeal,
    deleteMeal,
    updateMeal,
    refetchDashboard,
  ]);

  return (
    <MealsContext.Provider value={value}>{children}</MealsContext.Provider>
  );
}
