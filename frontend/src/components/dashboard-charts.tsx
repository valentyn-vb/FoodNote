'use client';

import {
  Bar,
  EvilBarChart,
  Grid as BarGrid,
  Tooltip as BarTooltip,
  XAxis,
} from '@/components/evilcharts/charts/bar-chart';
import NumberFlow from '@number-flow/react';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import { calorieConfig } from '@/lib/chart-config';
import type {
  DailyCaloriePoint,
  WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Shared by the mobile and desktop dashboard layouts — same chart, sized by
// className. Series colors and labels live in lib/chart-config.ts.

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

// Card + chart together, per review: dashboard blocks were duplicated inline
// across the mobile and desktop layouts in page.tsx. Styling stays owned by
// the caller (className / chartClassName) since mobile and desktop size them
// differently.
export function WeightTrendCard({
  className,
  chartClassName,
  title,
  action,
  data,
}: {
  className?: string;
  chartClassName?: string;
  title?: string;
  action?: ReactNode; // trailing control in the title row (the history drawer trigger)
  data: WeightTrendPoint[];
}) {
  return (
    <Card className={className}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          {title && (
            <div className="font-sans text-label font-semibold text-text">
              {title}
            </div>
          )}
          {action}
        </div>
      )}
      <WeightTrendChart className={chartClassName} data={data} />
    </Card>
  );
}

export function RemainingTodayRingCard({
  className,
  remainingKcal,
  goalKcal,
}: {
  className?: string;
  remainingKcal: number;
  goalKcal: number;
}) {
  return (
    <Card className={className}>
      <h2 className="self-start font-sans text-caption font-semibold text-text">
        Remaining today
      </h2>
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
              fill="#F5A65C"
              background={{ fill: '#F0EEE9' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <NumberFlow
            value={remainingKcal}
            className="font-display text-heading font-semibold text-text"
          />
          <span className="font-sans text-[10px] text-text-muted">
            kcal left
          </span>
        </div>
      </div>
    </Card>
  );
}
