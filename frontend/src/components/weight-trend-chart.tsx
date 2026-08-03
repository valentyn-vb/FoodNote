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

const PROJECTION_LEAD_SHARE = 1 / 3;
const WEIGHT_PADDING_KG = 1;

/**
 * Axis domains that show the weigh-ins plus a short lead into the projection.
 * Null when there is no band to protect: one weigh-in is not a trend being
 * squeezed, and its zero-width span gives no lead to measure.
 *
 * Always applied, because the axis has to be built from the data rather than
 * from the goal — the same rule Apple Health and Withings follow. A Projected
 * Goal Date two months out took two thirds of the width and pressed sixty days
 * of weigh-ins into the remaining third. The card's own subtitle already states
 * the goal date in words, so the dashed line only has to point at it, not reach
 * it.
 */
function cropToWeighIns(data: WeightTrendPoint[]) {
  const weighIns = data.filter(
    (point): point is WeightTrendPoint & { actual: number } =>
      point.actual !== undefined,
  );
  const firstWeighIn = weighIns.at(0);
  const newestWeighIn = weighIns.at(-1);
  if (!firstWeighIn || !newestWeighIn || firstWeighIn.t === newestWeighIn.t) {
    return null;
  }

  const weighedKilos = weighIns.map((point) => point.actual);
  return {
    weighIns,
    time: [
      firstWeighIn.t,
      newestWeighIn.t +
        (newestWeighIn.t - firstWeighIn.t) * PROJECTION_LEAD_SHARE,
    ],
    weight: [
      Math.min(...weighedKilos) - WEIGHT_PADDING_KG,
      Math.max(...weighedKilos) + WEIGHT_PADDING_KG,
    ],
  };
}

export function WeightTrendChart({
  className,
  data,
}: {
  className?: string;
  data: WeightTrendPoint[];
}) {
  const croppedTo = cropToWeighIns(data);

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
      <YAxis
        domain={croppedTo?.weight ?? ['dataMin - 1', 'dataMax + 1']}
        allowDataOverflow={croppedTo !== null}
        tickFormatter={(kg: number) => `${Math.round(kg)}`}
        width={34}
      />
      {/* The whole point of #68: a numeric time axis, so the Now→goal-date leg
          occupies the months it actually spans instead of one category slot. */}
      <XAxis
        dataKey="t"
        type="number"
        scale="time"
        domain={croppedTo?.time ?? ['dataMin', 'dataMax']}
        allowDataOverflow={croppedTo !== null}
        ticks={monthTicks(croppedTo?.weighIns ?? data)}
        tickFormatter={formatTrendTick}
      />
      {/* Markers make a lone weigh-in visible: one measurement cannot stroke a
          line, so without a dot a new account saw nothing for its own weight.
          `projected` is absent until the anchor point, so it picks up where
          `actual` stops without connectNulls. */}
      <Line dataKey="actual" lineProps={{ strokeWidth: 2 }}>
        <Dot variant="border" />
      </Line>
      {/* Thinner and dotless, under the readings it summarises: the day-to-day
          noise of a bathroom scale hides the direction, because water weight
          moves a reading by more than a week of a 0.5 kg/week plan does. */}
      <Line
        dataKey="trend"
        curveType="linear"
        lineProps={{ strokeWidth: 1.5 }}
      />
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
