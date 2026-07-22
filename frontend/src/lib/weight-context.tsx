'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { mockWeightTrend } from '@/lib/mock-data';

// Mirrors meals-context.tsx: lifted here (not the dashboard page) so the
// sidebar's "Log weight" trigger shares the same state as the dashboard's
// weight trend chart and "Weight change" stat — otherwise saving updates
// nothing anyone can see.
type WeightContextValue = {
  weightTrend: typeof mockWeightTrend;
  weightChangeKg: number;
  onWeightSaved: (weightKg: number) => void;
};

const WeightContext = createContext<WeightContextValue | null>(null);

export function useWeight() {
  const ctx = useContext(WeightContext);
  if (!ctx) throw new Error('useWeight must be used within WeightProvider');
  return ctx;
}

export function WeightProvider({ children }: { children: ReactNode }) {
  const [weightTrend, setWeightTrend] =
    useState<typeof mockWeightTrend>(mockWeightTrend);
  const actualPoints = weightTrend.filter((p) => p.actual !== undefined);
  const weightChangeKg =
    actualPoints.length > 1
      ? actualPoints.at(-1)!.actual! - actualPoints[0].actual!
      : 0;

  function onWeightSaved(weightKg: number) {
    // One entry per day, same as the API: today's point ("Now") is replaced,
    // never appended — a second save the same day isn't a new data point.
    setWeightTrend((prev) =>
      prev.map((p) =>
        p.week === 'Now'
          ? {
              ...p,
              actual: weightKg,
              // Keeps the dashed "projected" line starting from the new
              // value, per WeightTrendChart's continuity comment.
              projected: p.projected !== undefined ? weightKg : p.projected,
            }
          : p,
      ),
    );
  }

  return (
    <WeightContext.Provider
      value={{ weightTrend, weightChangeKg, onWeightSaved }}
    >
      {children}
    </WeightContext.Provider>
  );
}
