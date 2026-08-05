import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The small pill a stat states its movement in — used beside the weight figure
 * on the dashboard and on /weights.
 *
 * `positive` is for movement toward what the user asked for; everything else is
 * muted rather than red, because the scale going the wrong way for a week is
 * information, not a failure to colour-code at somebody.
 */
export function StatChip({
  tone,
  className,
  children,
}: {
  tone: 'positive' | 'neutral';
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex w-fit items-center gap-1.5 rounded-4xl px-2.5 py-0.5 text-sm font-medium tabular-nums',
        tone === 'positive'
          ? 'bg-success/15 text-success-text'
          : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}
