'use client';

import { useState } from 'react';
import Image from 'next/image';
import NumberFlow, { continuous, NumberFlowGroup } from '@number-flow/react';
import { Card } from '@/components/ui/card';
import { STAT_TILE_CLASS } from './helpers';

// Stat tile that toggles to its comparison period on click: the main number
// rolls to the other period's value (NumberFlow `continuous`) and a signed
// green/red delta fades in beside it. NumberFlowGroup keeps the two
// transitions in sync since the delta appearing shifts the main number.
export function CompareStat({
  label,
  value,
  compareLabel,
  compareValue,
  suffix,
  goodIsDown,
  mascotSrc,
}: {
  label: string;
  value: number;
  compareLabel: string;
  compareValue: number;
  suffix: string;
  goodIsDown: boolean; // is a lower value the desirable direction?
  mascotSrc?: string; // state-reflecting mascot peeking from the tile bottom
}) {
  const [comparing, setComparing] = useState(false);
  const delta = value - compareValue;
  const good = goodIsDown ? delta < 0 : delta > 0;

  return (
    <Card
      className={`${STAT_TILE_CLASS} relative cursor-pointer select-none`}
      onClick={() => setComparing((c) => !c)}
    >
      <div className="relative z-10 font-sans text-[12px] text-text-muted">
        {comparing ? compareLabel : label}
      </div>
      <NumberFlowGroup>
        <div className="relative z-10 flex items-baseline gap-2">
          <NumberFlow
            plugins={[continuous]}
            value={comparing ? compareValue : value}
            suffix={suffix}
            format={{ maximumFractionDigits: 1 }}
            className="font-display text-heading-lg font-semibold text-text"
          />
          {comparing && (
            <NumberFlow
              value={delta}
              format={{ signDisplay: 'always', maximumFractionDigits: 1 }}
              className={`font-sans text-label font-semibold ${
                good ? 'text-secondary-deep' : 'text-error'
              }`}
            />
          )}
        </div>
      </NumberFlowGroup>
      {/* After the text in the DOM: as first child it would trigger Card's
          has-[>img:first-child]:pt-0 rule and collapse the tile's top
          padding. Absolute + z-0 → behind the text, zero layout shift;
          Card's overflow-hidden clips it into a bottom "peek". */}
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
