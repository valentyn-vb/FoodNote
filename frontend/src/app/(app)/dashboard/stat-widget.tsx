'use client';

import Image from 'next/image';
import NumberFlow from '@number-flow/react';
import { Card } from '@/components/ui/card';

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
  mascotSrc,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  mascotSrc?: string;
}) {
  const spoken = `${label}: ${
    typeof value === 'string' ? value : NUMBER_FORMAT.format(value)
  }${suffix}`;

  return (
    <Card variant="tile" className="relative">
      {/* NumberFlow splits a number into per-digit animated spans and exposes no
          accessible name, so a screen reader currently reads these tiles as a
          label followed by scattered digits. One sr-only string carries the
          whole stat and the visual parts are hidden from the accessibility tree,
          which is also what makes the value assertable without betting on an
          animation library's internal markup. */}
      <span className="sr-only">{spoken}</span>
      <div
        aria-hidden="true"
        className="relative z-10 font-sans text-[12px] text-text-muted"
      >
        {label}
      </div>
      {typeof value === 'string' ? (
        <div
          aria-hidden="true"
          className="font-display text-heading-lg font-semibold text-text"
        >
          {value}
        </div>
      ) : (
        <NumberFlow
          value={value}
          suffix={suffix}
          locales="en-US"
          format={{ maximumFractionDigits: 1 }}
          aria-hidden="true"
          className="font-display text-heading-lg font-semibold text-text"
        />
      )}
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
