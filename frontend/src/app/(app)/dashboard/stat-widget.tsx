'use client';

import { Card } from '@/components/ui/card';
import NumberFlow from '@number-flow/react';
import Image from 'next/image';

// Matches what NumberFlow renders, so the spoken value and the visible digits
// cannot disagree. The locale is pinned rather than left to the browser: the
// component server-renders, and a server whose locale differs from the visitor's
// would otherwise produce a hydration mismatch on every stat.
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export function StatWidget({
  label,
  value,
  suffix = '',
  caption,
  mascotSrc,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  /** Small muted line under the value — a comparison baseline, not a unit. */
  caption?: string;
  mascotSrc?: string;
}) {
  const spoken = `${label}: ${
    typeof value === 'string' ? value : NUMBER_FORMAT.format(value)
  }${suffix}`;

  return (
    // `isolate`, so the z-0/z-10 pair below orders the label against the
    // mascot and nothing else. `relative` alone leaves z-index:auto, which is
    // not a stacking context: the label then competed with the shell's sticky
    // header at the same z-10, won on source order, and scrolled over it —
    // which reads as a see-through header.
    <Card className="relative isolate gap-1.5 rounded-lg px-4.5 py-4">
      {/* NumberFlow splits a number into per-digit animated spans and exposes no
          accessible name, so a screen reader currently reads these tiles as a
          label followed by scattered digits. One sr-only string carries the
          whole stat and the visual parts are hidden from the accessibility tree,
          which is also what makes the value assertable without betting on an
          animation library's internal markup. */}
      <span className="sr-only">{spoken}</span>
      <span
        aria-hidden="true"
        className="relative z-10 text-sm text-muted-foreground"
      >
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
        {caption && (
          <div className="relative z-10 font-sans text-xs text-text-muted">
            {caption}
          </div>
        )}
      </div>
      {mascotSrc && (
        <Image
          src={mascotSrc}
          alt=""
          width={76}
          height={76}
          className="absolute -bottom-2 left-[62%] z-0 -translate-x-1/2 opacity-85"
        />
      )}
    </Card>
  );
}
