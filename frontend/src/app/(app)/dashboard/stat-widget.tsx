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
    <Card className="relative gap-1.5 rounded-lg px-4.5 py-4">
      <span className="relative z-10 text-sm text-muted-foreground">
        {label}
      </span>
      <div className="font-heading text-2xl font-semibold tabular-nums">
        {typeof value === 'string' ? (
          value
        ) : (
          <NumberFlow
            value={value}
            suffix={suffix}
            format={{ maximumFractionDigits: 1 }}
          />
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
