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
import { ReferenceDot } from 'recharts';
import { weightConfig } from '@/lib/chart-config';
import { cn } from '@/lib/utils';
import {
  formatTrendDate,
  formatTrendTick,
  monthTicks,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

const PROJECTION_LEAD_SHARE = 1 / 3;
const WEIGHT_PADDING_KG = 1;

/**
 * Where the projection crosses the right edge of a cropped axis, carrying the
 * goal it is headed for. Null when the goal already fits — then the projection
 * ends at its own point and needs no stand-in.
 *
 * The marker sits at the edge rather than at the Projected Goal Date, which is
 * off-plot by construction: cropping the axis to the weigh-ins is what keeps
 * them legible. So it reads as "the line continues, and here is where to", and
 * says the real date in words rather than pretending to plot it.
 */
function projectionAtEdge(data: WeightTrendPoint[], edgeT: number) {
  const projected = data.filter((point) => point.projected !== undefined);
  const from = projected.at(0);
  const to = projected.at(-1);
  if (!from || !to || to.t <= edgeT || to.t === from.t) return null;

  const share = (edgeT - from.t) / (to.t - from.t);
  return {
    t: edgeT,
    kg: from.projected! + (to.projected! - from.projected!) * share,
    goalDate: formatTrendDate(to.t),
    goalKg: to.projected!,
  };
}

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
function cropToWeighIns(data: WeightTrendPoint[], hasProjection: boolean) {
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
      // The lead is room for the dashed line to head off in. With no projection
      // to draw — a reached target, or the weights page reading one window —
      // reserving it just leaves a third of the plot blank.
      newestWeighIn.t +
        (hasProjection
          ? (newestWeighIn.t - firstWeighIn.t) * PROJECTION_LEAD_SHARE
          : 0),
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
  const hasProjection = data.some((point) => point.projected !== undefined);
  const croppedTo = cropToWeighIns(data, hasProjection);
  const goalMarker = croppedTo
    ? projectionAtEdge(data, croppedTo.time[1])
    : null;
  // The legend lists whatever the config holds, so a config carrying `projected`
  // named a series the plot wasn't drawing whenever there was no projection.
  const measured = { actual: weightConfig.actual, trend: weightConfig.trend };

  return (
    <EvilLineChart
      data={data}
      config={hasProjection ? weightConfig : measured}
      // recharts puts tabindex="0" on its own <svg>, so clicking anything
      // inside it — a dot, the goal marker — focuses the whole plot and the
      // browser rings it. The ring is the full width of the card, which reads
      // as an error state rather than as focus.
      className={cn('[&_.recharts-surface]:outline-none', className)}
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
        // The domain starts at the first weigh-in and ends at the last, so
        // without this the outermost marks are drawn *on* the plot's edges: the
        // first dot half over the y-axis numbers, and the goal ring with its
        // outer half past the right edge. Pixels rather than a share of the
        // span, so the gap is the same at 7 days and at a year, and the domain
        // keeps saying only what was measured.
        padding={{ left: 8, right: 8 }}
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
      {/* Where the dashed line leaves the plot, and what it is aimed at. A
          hollow ring, not a filled dot: the weigh-ins are filled, and this is
          not a measurement. The name rides in an SVG <title> so hovering it
          says so — recharts' own Tooltip only tracks the plotted series. */}
      {goalMarker && (
        <ReferenceDot
          x={goalMarker.t}
          y={goalMarker.kg}
          ifOverflow="visible"
          shape={({ cx, cy }: { cx?: number; cy?: number }) => (
            <g>
              <title>
                {`Projected goal · ${goalMarker.goalDate} · ${goalMarker.goalKg} kg`}
              </title>
              {/* A wide transparent disc so the pointer finds a 5px ring. */}
              <circle cx={cx} cy={cy} r={12} fill="transparent" />
              <circle
                cx={cx}
                cy={cy}
                r={4.5}
                fill="var(--color-card)"
                stroke="var(--color-success)"
                strokeWidth={2}
              />
            </g>
          )}
        />
      )}
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
