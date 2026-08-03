'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { spokenStat } from './helpers';

export function StatWidget({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card className={cn('gap-1.5 rounded-lg px-4.5 py-4', className)}>
      {/* The label and the value are hidden from the accessibility tree and
          named once instead — see `spokenStat`. */}
      <span className="sr-only">{spokenStat(label, value)}</span>
      <span aria-hidden="true" className="text-sm text-muted-foreground">
        {label}
      </span>
      <div
        aria-hidden="true"
        className="font-heading text-2xl font-semibold tabular-nums"
      >
        {value}
      </div>
    </Card>
  );
}
