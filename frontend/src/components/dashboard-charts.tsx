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
import { Card } from '@/components/ui/card';
import { mockDailyCalories, mockWeightTrend } from '@/lib/mock-data';

// Shared by the mobile and desktop dashboard layouts — same chart, sized by
// className. Colors come from the FoodNote tokens, not EvilCharts defaults.

// Same metric, same color — solid vs dashed is what tells "actual" from
// "projected" apart, per the H03 "Weight trend & projection" annotation.
const weightConfig = {
  actual: { label: 'Actual', colors: { light: ['var(--fn-secondary)'] } },
  projected: {
    label: 'Projected',
    colors: { light: ['var(--fn-secondary)'] },
  },
};

const calorieConfig = {
  kcal: { label: 'kcal', colors: { light: ['var(--fn-primary)'] } },
};

export function WeightTrendChart({ className }: { className?: string }) {
  return (
    <EvilLineChart
      data={mockWeightTrend}
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

export function DailyCaloriesChart({ className }: { className?: string }) {
  return (
    <EvilBarChart
      data={mockDailyCalories}
      config={calorieConfig}
      className={className}
    >
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
}: {
  className?: string;
  chartClassName?: string;
  title?: string;
}) {
  return (
    <Card className={className}>
      {title && (
        <div className="font-sans text-label font-semibold text-text">
          {title}
        </div>
      )}
      <WeightTrendChart className={chartClassName} />
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
      <div className="self-start font-sans text-caption font-semibold text-text">
        Remaining today
      </div>
      {/* Recharts radial gauge — animates the arc on mount and on value
          change. Center label is an HTML overlay so NumberFlow can animate
          the figure (it can't render inside SVG <text>). */}
      <div className="relative size-[130px]">
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
