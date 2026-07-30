'use client';

import Image from 'next/image';
import NumberFlow from '@number-flow/react';
import { Card } from '@/components/ui/card';

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
  return (
    <Card variant="tile" className="relative">
      <div className="relative z-10 font-sans text-[12px] text-text-muted">
        {label}
      </div>
      {typeof value === 'string' ? (
        <div className="font-display text-heading-lg font-semibold text-text">
          {value}
        </div>
      ) : (
        <NumberFlow
          value={value}
          suffix={suffix}
          format={{ maximumFractionDigits: 1 }}
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
