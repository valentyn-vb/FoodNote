'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Liquid } from '@/components/canvasui/Liquid';
import { MascotPeek } from '@/components/marketing/mascot-peek';
import {
  SparklesIcon,
  type SparklesIconHandle,
} from '@/components/ui/sparkles';

export function OutroSlide() {
  const sparkleRef = useRef<SparklesIconHandle>(null);

  return (
    <div className="flex flex-col items-center gap-6 bg-bg px-6 py-16 sm:py-20">
      {/* bg-secondary is NOT the brand green — globals.css redefines
          --color-secondary twice inside the same @theme block (line 21 to
          --fn-secondary, line 56 to shadcn's own near-white --secondary),
          and the later one wins. Using the raw token directly here rather
          than fighting that pre-existing collision (flagged separately,
          out of scope for this ticket to fix repo-wide). */}
      <div className="relative w-full max-w-[900px]">
        <Liquid
          className="overflow-hidden rounded-[32px]"
          color={[0.357, 0.725, 0.549]}
        >
          <div className="flex flex-col items-center gap-6 bg-[var(--fn-secondary)] px-8 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-14">
            <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
              <h2 className="font-[family-name:var(--font-accent-serif)] text-[clamp(30px,4vw,40px)] text-white italic">
                Ready to stop guessing?
              </h2>
              <p className="font-sans text-[15px] text-white/85">
                Start for free. No credit card required.
              </p>
            </div>
            <Button
              render={<Link href="/register" />}
              nativeButton={false}
              variant="secondary"
              className="shrink-0 gap-2 bg-white px-7 py-3.5 text-secondary-deep hover:bg-white/90"
              onMouseEnter={() => sparkleRef.current?.startAnimation()}
              onMouseLeave={() => sparkleRef.current?.stopAnimation()}
            >
              <SparklesIcon ref={sparkleRef} size={16} />
              Create your free account
            </Button>
          </div>
        </Liquid>
        {/* Last section on the page — no scroll room left below it for the
            default trigger range to complete, so it finishes earlier here. */}
        <MascotPeek
          src="/mascot/foodnotemascotjump.avif"
          className="-top-8 right-[10%] size-16 sm:size-20"
          rotate={8}
          offset={['start 0.95', 'start 0.7']}
        />
      </div>

      <p className="font-sans text-[13px] text-text-muted">
        Already have one?{' '}
        <Link
          href="/login"
          className="font-medium text-primary-deep hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
