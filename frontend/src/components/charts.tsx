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
import { ReferenceLine } from 'recharts';
import type {
  CalorieSplitSegment,
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
  // The fit is a different statement from the readings, so it gets a different
  // colour rather than a third weight of the same green.
  trend: { label: 'Trend', colors: { light: ['var(--brand-ink)'] } },
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
          would flatten the trend into a straight line. Shown, not hidden: a
          weight line without a scale beside it says only "downwards". */}
      <YAxis
        domain={['dataMin - 0.4', 'dataMax + 0.4']}
        tickFormatter={(kg: number) => `${Math.round(kg)}`}
        unit=" kg"
        width={52}
      />
      {/* Dates, thinned by width rather than by count: one point per weigh-in
          means the tick count varies with how often the user steps on the
          scale, and `minTickGap` is what keeps them from colliding. */}
      <LineXAxis dataKey="label" minTickGap={40} />
      {/* `projected` is absent until the last actual point, so it picks up
          right where `actual` stops without connectNulls. */}
      <Line dataKey="actual" lineProps={{ strokeWidth: 2.5 }}>
        {/* A marker per weigh-in: the readings are the data, the line between
            them is the interpolation. */}
        <Dot variant="border" />
      </Line>
      {/* Thinner and dotless, under the readings it summarises. */}
      <Line
        dataKey="trend"
        curveType="linear"
        lineProps={{ strokeWidth: 1.5 }}
      />
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
  target,
}: {
  className?: string;
  data: DailyCaloriePoint[];
  /** Drawn as a dashed rule across the week. */
  target: number;
}) {
  return (
    <EvilBarChart data={data} config={calorieConfig} className={className}>
      <BarGrid />
      {/* Seven days is the whole domain, so every one of them gets a label.
          Left to recharts' `preserveEnd` against the default `minTickGap` of 8,
          the axis silently drops Wed below 223px of chart width (#123). */}
      <XAxis dataKey="day" interval={0} />
      <Bar dataKey="kcal" radius={4} />
      {/* Dashed, in the brand ink rather than the bars' fill: it is the line
          the bars are read against, not another series.

          `extendDomain` because recharts builds the y-domain from the data
          alone: on a week spent under target the rule falls above dataMax and
          is silently clipped — exactly the week it matters most on. */}
      <ReferenceLine
        y={target}
        ifOverflow="extendDomain"
        stroke="var(--color-brand-ink)"
        strokeDasharray="4 4"
        strokeWidth={1.5}
      />
      <BarTooltip />
    </EvilBarChart>
  );
}

/**
 * The donut's colours, by segment key. Held here rather than at the call site
 * so the ring and the legend beside it cannot drift: both read this map.
 * `remaining` is deliberately the muted role — the unfilled part of the target
 * is the absence of a meal, not a fifth one.
 */
export const CALORIE_SPLIT_COLORS: Record<CalorieSplitSegment['key'], string> =
  {
    breakfast: 'var(--color-chart-1)',
    lunch: 'var(--color-chart-2)',
    dinner: 'var(--color-chart-3)',
    snack: 'var(--color-chart-4)',
    remaining: 'var(--color-muted)',
  };

// Ring geometry, in the units of the 100x100 viewBox below.
const RING_MID_RADIUS = 38;
const RING_THICKNESS = 14;
const RING_INNER = RING_MID_RADIUS - RING_THICKNESS / 2;
const RING_OUTER = RING_MID_RADIUS + RING_THICKNESS / 2;

/** `turns` is 0..1 clockwise from the top; SVG angles run clockwise too. */
function turnsToRadians(turns: number): number {
  return (turns - 0.25) * 2 * Math.PI;
}

function polar(radius: number, radians: number): string {
  return `${50 + radius * Math.cos(radians)} ${50 + radius * Math.sin(radians)}`;
}

/** One segment of the ring: a filled annulus sector with square ends. */
function segmentPath(from: number, to: number): string {
  const start = turnsToRadians(from);
  const end = turnsToRadians(to);
  const large = end - start > Math.PI ? 1 : 0;

  // Traversed clockwise: out along the outer arc, in at the far edge, back
  // along the inner arc.
  return [
    `M ${polar(RING_OUTER, start)}`,
    `A ${RING_OUTER} ${RING_OUTER} 0 ${large} 1 ${polar(RING_OUTER, end)}`,
    `L ${polar(RING_INNER, end)}`,
    `A ${RING_INNER} ${RING_INNER} 0 ${large} 0 ${polar(RING_INNER, start)}`,
    'Z',
  ].join(' ');
}

/**
 * The day's calories as a ring, split by meal time. Sized by the caller; the
 * figure in the middle is the caller's too — it is a NumberFlow that needs an
 * `sr-only` name, which SVG text inside a chart cannot carry.
 *
 * Drawn by hand rather than with a recharts Pie, because a Pie cannot make the
 * shape: `cornerRadius` is per-sector and rounds all four of a sector's
 * corners, and `paddingAngle` breaks the day into separate arcs. The ring is
 * one continuous band — every end square, every join square — and it carries no
 * tooltip or legend of its own (the card draws the legend), so nothing was lost
 * with the Pie.
 *
 * A day with nothing logged is the bare track: an empty ring would read as a
 * chart that failed to load.
 */
export function CalorieSplitDonut({
  className,
  data,
}: {
  className?: string;
  data: CalorieSplitSegment[];
}) {
  const total = data.reduce((sum, segment) => sum + segment.kcal, 0);
  if (total <= 0) return <svg className={className} viewBox="0 0 100 100" />;

  // Each segment starts where the previous one ended, as a running total
  // rather than a reassigned cursor — the compiler's immutability rule rejects
  // writing to an outer variable from inside a map.
  const arcs = data.reduce<
    { key: CalorieSplitSegment['key']; from: number; to: number }[]
  >((acc, segment) => {
    const from = acc.at(-1)?.to ?? 0;
    return [
      ...acc,
      { key: segment.key, from, to: from + segment.kcal / total },
    ];
  }, []);

  return (
    // Decorative: the card states the same numbers in text beside it.
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {arcs.map((arc) =>
        // A single segment filling the ring has no two ends to draw a sector
        // between, so it is a stroked circle instead.
        arc.to - arc.from > 0.999 ? (
          <circle
            key={arc.key}
            cx="50"
            cy="50"
            r={RING_MID_RADIUS}
            fill="none"
            stroke={CALORIE_SPLIT_COLORS[arc.key]}
            strokeWidth={RING_THICKNESS}
          />
        ) : (
          <path
            key={arc.key}
            d={segmentPath(arc.from, arc.to)}
            fill={CALORIE_SPLIT_COLORS[arc.key]}
          />
        ),
      )}
    </svg>
  );
}
