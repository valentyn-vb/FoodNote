'use client';

import Image from 'next/image';
import NumberFlow from '@number-flow/react';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

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
      <Text variant="caption" tone="muted" className="relative z-10">
        {label}
      </Text>
      <Text variant="heading" numeric>
        {typeof value === 'string' ? (
          value
        ) : (
          <NumberFlow
            value={value}
            suffix={suffix}
            format={{ maximumFractionDigits: 1 }}
          />
        )}
      </Text>
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
