'use client';

import type { WeightEntryResponse } from '@foodnote/shared';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import {
  formatGoalDate,
  formatTrendDate,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';
import { ChartCard } from './chart-card';
import { WeightHistoryDrawer } from './weight-history-drawer';

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
  entries,
  onWeightsChanged,
  trend,
  monthChangeKg,
  projectedGoalDate,
  className,
}: {
  entries: WeightEntryResponse[];
  onWeightsChanged: () => void;
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
  const count = `${entries.length} ${entries.length === 1 ? 'weigh-in' : 'weigh-ins'}`;
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
      action={
        <WeightHistoryDrawer
          entries={entries}
          onWeightsChanged={onWeightsChanged}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="touch-target -my-1 text-brand-ink"
            >
              View full history
              <ChevronRight />
            </Button>
          }
        />
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
