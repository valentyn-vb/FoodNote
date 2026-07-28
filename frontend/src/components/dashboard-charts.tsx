'use client';

import {
  Dot,
  EvilLineChart,
  Grid as LineGrid,
  Legend as LineLegend,
  Line,
  Tooltip as LineTooltip,
  XAxis as LineXAxis,
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
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import {
  formatTrendTick,
  type DailyCaloriePoint,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// Shared by the mobile and desktop dashboard layouts — same chart, sized by
// className. Colors come from the FoodNote tokens, not EvilCharts defaults.

// One metric, one hue (the H03 "Weight trend & projection" annotation), in two
// shades: logged weight is the deeper, measured green; the projection is a
// lighter tint, since a forecast reading lighter than real data is the point.
// Solid vs dashed still carries the split in the plot, but the legend swatch is
// a plain filled square (evilcharts/ui/legend LegendIndicator) and cannot show
// a dash — with one shared color the two keys were indistinguishable there.
const weightConfig = {
  actual: { label: 'Logged', colors: { light: ['var(--fn-secondary-deep)'] } },
  projected: {
    label: 'Projected',
    colors: {
      light: ['color-mix(in oklch, var(--fn-secondary), white 38%)'],
    },
  },
};

const calorieConfig = {
  kcal: { label: 'kcal', colors: { light: ['var(--fn-primary)'] } },
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
      {/* Solid hairline: a dashed grid reads as "projection", which is the one
          thing dashing means in this chart. */}
      <LineGrid strokeDasharray="0" />
      {/* Fitted, non-zero domain — body weight sits in a narrow band and a
          zero-based axis would flatten the trend into a flat line. A truncated
          scale has to be *labelled* to stay honest, hence no `hide`. */}
      <YAxis
        domain={['dataMin - 1', 'dataMax + 1']}
        tickFormatter={(kg: number) => `${Math.round(kg)}`}
        width={30}
      />
      {/* The whole point of #68: a numeric time axis, so the Now→goal-date leg
          occupies the months it actually spans instead of one category slot. */}
      <LineXAxis
        dataKey="t"
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
        tickFormatter={formatTrendTick}
        minTickGap={24}
      />
      {/* Markers make a lone weigh-in visible: one measurement cannot stroke a
          line, so without a dot a new account saw nothing for its own weight.
          `projected` is absent until the anchor point, so it picks up where
          `actual` stops without connectNulls. */}
      <Line dataKey="actual" lineProps={{ strokeWidth: 2 }}>
        <Dot variant="border" />
      </Line>
      <Line
        dataKey="projected"
        strokeVariant="dashed"
        lineProps={{ strokeWidth: 2 }}
      />
      <LineTooltip labelFormatter={(label) => formatTrendTick(Number(label))} />
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
