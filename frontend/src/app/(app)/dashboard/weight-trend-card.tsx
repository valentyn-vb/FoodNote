'use client';

import type { WeightEntryResponse } from '@foodnote/shared';
import { WeightTrendChart } from '@/components/weight-trend-chart';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatGoalDate,
  type WeightTrendPoint,
} from '@/lib/dashboard-transforms';
import { WEIGHT_WINDOW_DAYS } from '@/lib/weight-context';
import { ChartCard } from './chart-card';
import { InlineError } from './states';
import { WeightHistoryDrawer } from './weight-history-drawer';

/**
 * The weight journal as a line, with the projection to the target picking up
 * where it ends. The sub-line states in words what the chart shows in shape —
 * how many weigh-ins it is drawn from, which way they moved, and when the plan
 * lands — because a six-point line at 235px is a gesture, not a reading.
 */
export function WeightTrendCard({
  status,
  onRetry,
  entries,
  onWeightsChanged,
  trend,
  monthChangeKg,
  projectedGoalDate,
  className,
}: {
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  entries: WeightEntryResponse[];
  onWeightsChanged: () => void;
  trend: WeightTrendPoint[];
  monthChangeKg: number;
  projectedGoalDate: string | null;
  className?: string;
}) {
  const direction = monthChangeKg < 0 ? 'down' : 'up';
  const subtitle =
    status === 'ready'
      ? [
          // The window is stated, not implied: the count is however many
          // entries the provider's window holds, which is neither "the last N"
          // nor "all of them" — and unqualified it reads as both.
          `${entries.length} ${entries.length === 1 ? 'weigh-in' : 'weigh-ins'} in ${WEIGHT_WINDOW_DAYS} days`,
          monthChangeKg !== 0 &&
            `${direction} ${Math.abs(monthChangeKg)} kg this month`,
          projectedGoalDate && `goal by ${formatGoalDate(projectedGoalDate)}`,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

  return (
    <ChartCard
      title="Weight trend"
      subtitle={subtitle}
      action={
        status === 'ready' && (
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
        )
      }
      className={className}
    >
      {status === 'ready' ? (
        <WeightTrendChart
          className="aspect-auto min-h-0 w-full grow basis-0"
          data={trend}
        />
      ) : status === 'error' ? (
        <InlineError onRetry={onRetry} />
      ) : (
        <Skeleton className="min-h-0 w-full grow basis-0" />
      )}
    </ChartCard>
  );
}
