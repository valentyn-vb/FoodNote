'use client';

import { motion, useReducedMotion } from 'motion/react';
import { GradientMesh } from '@/components/marketing/gradient-mesh';

// Strong ease-out curve per animation standards (--ease-out).
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function QuoteSlide() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex flex-col items-center gap-4 bg-bg px-6 py-28 sm:py-36">
      <GradientMesh />
      <motion.p
        initial={
          shouldReduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 20, scale: 0.96 }
        }
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="relative z-10 max-w-2xl text-center text-balance font-[family-name:var(--font-accent-serif)] text-[clamp(28px,4.6vw,48px)] leading-[1.2] text-text italic"
      >
        &ldquo;Those are cute. Good idea! But please give the files descriptive
        names, like{' '}
        <span className="font-mono not-italic">mascote-lauging.webp</span>
        .&rdquo;
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.2 }}
        className="relative z-10 font-sans text-[14px] text-text-muted"
      >
        An actual PR review comment by Sergey R.
      </motion.p>
    </div>
  );
}
