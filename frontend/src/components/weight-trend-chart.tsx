'use client';

import {
  Dot,
  EvilLineChart,
  Grid,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/evilcharts/charts/line-chart';
import { weightConfig } from '@/lib/chart-config';
import {
  formatTrendDate,
  formatTrendTick,
  monthTicks,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

// The logged-weight + projection line chart, shared by the mobile and desktop
// dashboard layouts — same chart, sized by className. Wrapped in a Card by
// WeightTrendCard in dashboard-charts.tsx.

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
      // Straight segments between weigh-ins. `monotone` smoothed the measured
      // line into curvature that was never recorded — weight between two
      // weigh-ins is unknown, not gently curved.
      curveType="linear"
    >
      {/* Solid hairline: a dashed grid reads as "projection", which is the one
          thing dashing means in this chart. */}
      <Grid strokeDasharray="0" />
      {/* Fitted, non-zero domain — body weight sits in a narrow band and a
          zero-based axis would flatten the trend into a flat line. A truncated
          scale has to be *labelled* to stay honest, hence no `hide`. */}
      {/* Labels on the right, next to the newest reading — the edge the eye
          lands on first, and what Apple Health and Withings both do for weight. */}
      <YAxis
        orientation="right"
        domain={['dataMin - 1', 'dataMax + 1']}
        tickFormatter={(kg: number) => `${Math.round(kg)}`}
        width={34}
      />
      {/* The whole point of #68: a numeric time axis, so the Now→goal-date leg
          occupies the months it actually spans instead of one category slot. */}
      <XAxis
        dataKey="t"
        type="number"
        scale="time"
        domain={['dataMin', 'dataMax']}
        ticks={monthTicks(data)}
        tickFormatter={formatTrendTick}
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
      {/* The tooltip keeps day precision — months are the axis unit, not the
          resolution the data was recorded at.
          evilcharts/ui/tooltip.tsx's ChartTooltipContent doesn't pass the
          x-axis value as labelFormatter's first argument — it passes the
          series' config label ("Logged"/"Projected") instead, so
          `formatTrendDate(Number(label))` silently formatted NaN into ''.
          The real value is on the second argument, in the hovered point's
          own data (`payload[0].payload.t`). */}
      <Tooltip
        labelFormatter={(_, payload) =>
          formatTrendDate(Number(payload?.[0]?.payload?.t))
        }
      />
      <Legend />
    </EvilLineChart>
  );
}
