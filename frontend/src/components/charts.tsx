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
import type {
  DailyCaloriePoint,
  WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Sized by the caller — a height is layout. Colours come from the roles by what
// the data means: weight is progress toward the goal, calories are the day's own
// metric.

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
      {/* Seven days is the whole domain, so every one of them gets a label.
          Left to recharts' `preserveEnd` against the default `minTickGap` of 8,
          the axis silently drops Wed below 223px of chart width (#123). */}
      <XAxis dataKey="day" interval={0} />
      <Bar dataKey="kcal" radius={4} />
      <BarTooltip />
    </EvilBarChart>
  );
}
