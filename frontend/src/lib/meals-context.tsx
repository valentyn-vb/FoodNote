'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  mockDashboardStats,
  mockRecentMeals,
  type Meal,
} from '@/lib/mock-data';

// Lifted out of the dashboard page so the sidebar's "Log a meal" trigger (a
// sibling in the shared (app) layout, not a child of the dashboard) shares
// the same meals state — otherwise it saves into a void nothing reads.
type MealsContextValue = {
  meals: Meal[];
  eatenKcal: number;
  remainingKcal: number;
  progressPct: number;
  goalKcal: number;
  onMealSaved: (kcal: number) => void;
  onMealUndone: () => void;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function useMeals() {
  const ctx = useContext(MealsContext);
  if (!ctx) throw new Error('useMeals must be used within MealsProvider');
  return ctx;
}

export function MealsProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>(mockRecentMeals);
  const goalKcal = mockDashboardStats.goalKcal;
  const eatenKcal = meals.reduce((sum, meal) => sum + meal.kcal, 0);
  const remainingKcal = Math.max(0, goalKcal - eatenKcal);
  const progressPct = Math.min(100, Math.round((eatenKcal / goalKcal) * 100));

  function onMealSaved(kcal: number) {
    setMeals((prev) => [
      ...prev,
      {
        id: `m${prev.length + 1}`,
        name: 'Chicken with rice, salad and latte',
        kcal,
        source: 'ai',
        loggedAt: 'Just now',
      },
    ]);
  }

  function onMealUndone() {
    // Only pop meals added this session — never the seeded mock entries.
    setMeals((prev) =>
      prev.length > mockRecentMeals.length ? prev.slice(0, -1) : prev,
    );
  }

  return (
    <MealsContext.Provider
      value={{
        meals,
        eatenKcal,
        remainingKcal,
        progressPct,
        goalKcal,
        onMealSaved,
        onMealUndone,
      }}
    >
      {children}
    </MealsContext.Provider>
  );
}
