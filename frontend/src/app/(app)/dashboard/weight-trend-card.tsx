'use client';

import Link from 'next/link';
import { ChartCard } from '@/components/chart-card';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import { buttonVariants } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import {
  formatGoalDate,
  formatTrendDate,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';

/**
 * The weight journal as a line, with the projection to the target picking up
 * where it ends. The sub-line states in words what the chart shows in shape —
 * how many weigh-ins it is drawn from, which way they moved, and when the plan
 * lands — because a six-point line at 235px is a gesture, not a reading.
 *
 * It carried its own three states — skeleton, inline error, chart — because the
 * weight journal was a second client fetch that could fail on its own while the
 * tiles were fine. It is read on the server beside the other two now, so the
 * three fail and retry as one: `loading.tsx` covers the wait and `error.tsx` the
 * failure. The granularity is genuinely lost, and it was worth less than it cost
 * — a card offering "try again" for a request the rest of the page had already
 * survived.
 */
export function WeightTrendCard({
  weighInCount,
  trend,
  monthChangeKg,
  projectedGoalDate,
  className,
}: {
  weighInCount: number;
  trend: WeightTrendPoint[];
  monthChangeKg: number;
  projectedGoalDate: string | null;
  className?: string;
}) {
  const direction = monthChangeKg < 0 ? 'down' : 'up';
  // The date the plot starts at, which is the first weigh-in and not the
  // provider's 60-day window: the axis is cropped to the readings, so naming
  // the window described a span the chart no longer draws.
  const firstWeighIn = trend.find((point) => point.actual !== undefined)?.t;
  const count = `${weighInCount} ${weighInCount === 1 ? 'weigh-in' : 'weigh-ins'}`;
  const subtitle = [
    firstWeighIn === undefined
      ? count
      : `${count} since ${formatTrendDate(firstWeighIn)}`,
    monthChangeKg !== 0 &&
      `${direction} ${Math.abs(monthChangeKg)} kg this month`,
    projectedGoalDate && `goal by ${formatGoalDate(projectedGoalDate)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ChartCard
      title="Weight trend"
      subtitle={subtitle}
      // A link, not a drawer. The drawer was the whole journal's only home
      // before /weights existed; now it was a second, smaller copy of that page
      // — the same rows over the dashboard's 60-day window, with no range to
      // move and no chart beside them. Two lists of one journal drift, and this
      // one already had: it offered a delete on entries the page would not.
      // `buttonVariants` on the Link, not `Button render={<Link/>}` — ui/button
      // says why: the latter logs that Base UI wanted a real <button>, and the
      // `nativeButton={false}` that silences it stamps `role="button"` on the
      // anchor, so the a11y tree announces a button and drops the URL.
      action={
        <Link
          href="/weights"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'touch-target -my-1 text-brand-ink',
          })}
        >
          View full history
          <ChevronRight />
        </Link>
      }
      className={className}
    >
      <WeightTrendChart
        className="aspect-auto min-h-0 w-full grow basis-0"
        data={trend}
      />
    </ChartCard>
  );
}
