'use client';

import {
  Bar,
  Grid as BarGrid,
  Tooltip as BarTooltip,
  EvilBarChart,
  XAxis,
} from '@/components/evilcharts/charts/bar-chart';
import { calorieConfig } from '@/lib/chart-config';
import type { DailyCaloriePoint } from '@/lib/dashboard-transforms';
import NumberFlow from '@number-flow/react';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts';

export function DailyCaloriesChart({
  className,
  data,
}: {
  className?: string;
  data: DailyCaloriePoint[];
}) {
  return (
    <EvilBarChart data={data} config={calorieConfig} className={className}>
      <BarGrid />
      <XAxis dataKey="day" />
      <Bar dataKey="kcal" radius={4} />
      <BarTooltip />
    </EvilBarChart>
  );
}

/**
 * The remaining-calories gauge, label and all. The centre figure is an HTML
 * overlay rather than SVG <text> so NumberFlow can animate it.
 */
export function RemainingTodayRing({
  remainingKcal,
  goalKcal,
}: {
  remainingKcal: number;
  goalKcal: number;
}) {
  return (
    <>
      {/* Recharts radial gauge — animates the arc on mount and on value
          change. Center label is an HTML overlay so NumberFlow can animate
          the figure (it can't render inside SVG <text>). */}
      <div className="relative size-[110px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ value: remainingKcal }]}
            innerRadius="82%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, goalKcal]}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill="var(--primary)"
              background={{ fill: 'var(--border)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold tabular-nums">
            <NumberFlow value={remainingKcal} />
          </span>
          <span className="text-sm text-muted-foreground">kcal left</span>
        </div>
      </div>
    </>
  );
}
