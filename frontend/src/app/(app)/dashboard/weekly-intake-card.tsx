'use client';

import { DailyCaloriesChart } from '@/components/charts';
import type { DailyCaloriePoint } from '@/lib/dashboard-transforms';
import { ChartCard } from './chart-card';
import { formatFigure } from './helpers';

/**
 * Seven days of intake against the target. Days with nothing logged are honest
 * zero bars, and the dashed rule is what turns a row of bars into a comparison.
 */
export function WeeklyIntakeCard({
  data,
  calorieTarget,
  className,
}: {
  data: DailyCaloriePoint[];
  calorieTarget: number;
  className?: string;
}) {
  return (
    <ChartCard
      title="7-day intake"
      subtitle={`Daily kcal vs ${formatFigure(calorieTarget)} target`}
      action={
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="w-4 border-t-2 border-dashed border-brand-ink"
          />
          Target
        </span>
      }
      className={className}
    >
      <DailyCaloriesChart
        className="aspect-auto min-h-0 w-full grow basis-0"
        data={data}
        target={calorieTarget}
      />
    </ChartCard>
  );
}
