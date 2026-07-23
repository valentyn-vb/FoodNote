'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

// Shared mascot moment, used at the feature grid, both Intro blocks, and the
// final CTA. Slides in from the right as its section scrolls into view and
// back out as it scrolls away, driven by scroll position rather than a
// once-only trigger, so it reverses naturally on scroll-up (same
// useScroll/useTransform pattern as the hero parallax and quote reveal).
export function MascotPeek({
  src,
  className,
  rotate = 6,
  offset = ['start 0.9', 'start 0.4'],
}: {
  src: string;
  className?: string;
  rotate?: number;
  // Override for sections with no scroll room left below them (e.g. the
  // last one on the page) — the default range needs the element to reach
  // 40% up the viewport, which a bottom-of-page element may never get to
  // before the page runs out of scroll, leaving it stuck mid-reveal.
  offset?: ScrollOffset;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });
  const x = useTransform(scrollYProgress, [0, 1], [80, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      ref={ref}
      className={cn('pointer-events-none absolute', className)}
      style={{ x, opacity, rotate }}
    >
      <Image src={src} alt="" fill className="object-contain" />
    </motion.div>
  );
}
