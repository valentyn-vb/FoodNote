'use client';

import { motion, useReducedMotion } from 'motion/react';

// Same easing convention as evilcharts/charts/line-chart.tsx's REVEAL_EASE.
const REVEAL_EASE: [number, number, number, number] = [0, 0.7, 0.5, 1];

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: REVEAL_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
