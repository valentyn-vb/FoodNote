'use client';

import {
  EvilLineChart,
  Grid as LineGrid,
  Legend as LineLegend,
  Line,
  Tooltip as LineTooltip,
  YAxis,
} from '@/components/evilcharts/charts/line-chart';
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
import { Text } from '@/components/ui/text';
import type {
  DailyCaloriePoint,
  WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Shared by the mobile and desktop dashboard layouts — same chart, sized by the
// caller (a height is layout). Colours come from the roles by what the data
// means: weight is progress toward the goal, calories are the day's own metric.

// Same metric, same color — solid vs dashed is what tells "actual" from
// "projected" apart, per the H03 "Weight trend & projection" annotation.
const weightConfig = {
  actual: { label: 'Actual', colors: { light: ['var(--success)'] } },
  projected: {
    label: 'Projected',
    colors: { light: ['var(--success)'] },
  },
};

const calorieConfig = {
  kcal: { label: 'kcal', colors: { light: ['var(--primary)'] } },
};

export function WeightTrendChart({
  className,
  data,
}: {
  className?: string;
  data: WeightTrendPoint[];
}) {
  return (
    <EvilLineChart
      data={data}
      config={weightConfig}
      className={className}
      curveType="monotone"
    >
      <LineGrid />
      {/* Fitted domain — kg values sit in a ~1.5 kg band; a zero-based axis
          would flatten the trend into a straight line. */}
      <YAxis hide domain={['dataMin - 0.4', 'dataMax + 0.4']} />
      {/* `projected` starts null/absent until "Now", so it picks up right
          where `actual` stops without connectNulls. */}
      <Line dataKey="actual" lineProps={{ strokeWidth: 2.5 }} />
      <Line
        dataKey="projected"
        strokeVariant="dashed"
        lineProps={{ strokeWidth: 2.5 }}
      />
      <LineTooltip />
      <LineLegend />
    </EvilLineChart>
  );
}

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
              background={{ fill: 'var(--track)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <Text variant="heading" numeric>
            <NumberFlow value={remainingKcal} />
          </Text>
          <Text variant="caption" tone="muted">
            kcal left
          </Text>
        </div>
      </div>
    </>
  );
}
