'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { GradientMesh } from '@/components/marketing/gradient-mesh';

export function QuoteSlide() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.95', 'start 0.25'],
  });
  // Springing the raw scroll value (rather than transforming it directly)
  // is what removes the "abrupt" snap — the reveal trails the scroll instead
  // of tracking it 1:1, and the two lines stagger off the same spring.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 20,
    mass: 0.5,
  });
  const rawScale = useTransform(smooth, [0, 1], [0.9, 1]);
  const quoteOpacity = useTransform(smooth, [0, 0.8], [0, 1]);
  const rawQuoteY = useTransform(smooth, [0, 0.8], [18, 0]);
  // The punchline is the reveal that this was a real internal note, not a
  // testimonial — it lands a beat after the quote itself, not alongside it.
  const attributionOpacity = useTransform(smooth, [0.5, 1], [0, 1]);
  // Reduced motion keeps the opacity fade (still communicates the reveal)
  // but drops the scale/translate movement.
  const scale = shouldReduceMotion ? 1 : rawScale;
  const quoteY = shouldReduceMotion ? 0 : rawQuoteY;

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center gap-3 bg-bg px-6 py-28 sm:py-36"
    >
      <GradientMesh />
      <motion.p
        style={{ opacity: quoteOpacity, y: quoteY, scale }}
        className="relative z-10 max-w-2xl text-center text-balance font-[family-name:var(--font-accent-serif)] text-[clamp(28px,4.6vw,48px)] leading-[1.2] text-text italic"
      >
        &ldquo;Those are cute. Good idea! But please give the files descriptive
        names, like{' '}
        <span className="font-mono not-italic">mascote-lauging.webp</span>
        .&rdquo;
      </motion.p>
      <motion.p
        style={{ opacity: attributionOpacity }}
        className="relative z-10 font-sans text-[14px] text-text-muted"
      >
        An actual PR review comment by Sergey R.
      </motion.p>
    </div>
  );
}
