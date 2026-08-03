'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * The shell the three chart cards share: a title, a line of context under it,
 * an optional action opposite, and the chart filling whatever is left.
 *
 * The header is `shrink-0` and the body `min-h-0`, so the chart absorbs the
 * card's height rather than pushing the header out of it — a recharts
 * container in a flex column will otherwise never shrink below its content.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn('gap-4 p-5', className)}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {/* The gap is what separates a chart from the legend under it — without
          it the two touch, and the legend reads as part of the plot. */}
      <div className="flex min-h-0 grow basis-0 flex-col gap-4">{children}</div>
    </Card>
  );
}
