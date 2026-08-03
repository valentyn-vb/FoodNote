'use client';

import NumberFlow from '@number-flow/react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { spokenStat } from './helpers';

export function StatWidget({
  label,
  value,
  suffix = '',
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  const spoken = spokenStat(label, value, suffix);

  return (
    <Card className={cn('gap-1.5 rounded-lg px-4.5 py-4', className)}>
      {/* NumberFlow splits a number into per-digit animated spans and exposes no
          accessible name, so a screen reader currently reads these tiles as a
          label followed by scattered digits. One sr-only string carries the
          whole stat and the visual parts are hidden from the accessibility tree,
          which is also what makes the value assertable without betting on an
          animation library's internal markup. */}
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="text-sm text-muted-foreground">
        {label}
      </span>
      <div
        aria-hidden="true"
        className="font-heading text-2xl font-semibold tabular-nums"
      >
        {typeof value === 'string' ? (
          value
        ) : (
          <NumberFlow
            value={value}
            suffix={suffix}
            locales="en-US"
            format={{ maximumFractionDigits: 1 }}
          />
        )}
      </div>
    </Card>
  );
}
