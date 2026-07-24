'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { FlaskConical, Scale, UtensilsCrossed } from 'lucide-react';
import { GaugeIcon } from '@/components/ui/gauge';
import { ShieldCheckIcon } from '@/components/ui/shield-check';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { MascotPeek } from '@/components/marketing/mascot-peek';

type Feature = {
  icon: typeof UtensilsCrossed;
  title: string;
  description: string;
  bg: string;
  iconColor: string;
};

// Gauge and ShieldCheck have exact hover-animated matches in lucide-animated
// (built on Motion, already installed — zero new runtime deps); the other
// three icons don't have equivalents in that set, so they stay static rather
// than forcing a substitute icon that doesn't mean the same thing.
const FEATURES: Feature[] = [
  {
    icon: UtensilsCrossed,
    title: 'AI-Assisted Meal Logging',
    description:
      'Describe what you ate. Get calories and macros back in seconds.',
    bg: 'from-[#fde3da] to-[#fbeee6]',
    iconColor: 'text-[#c65a3e]',
  },
  {
    icon: Scale,
    title: 'Weight Journal & Trend',
    description:
      'Log whenever you want. Watch your trend and projected date update automatically.',
    bg: 'from-[#dcf0e4] to-[#eef7f0]',
    iconColor: 'text-secondary-deep',
  },
  {
    icon: GaugeIcon as unknown as typeof UtensilsCrossed,
    title: 'Personalized Pace',
    description:
      'From gentle to aggressive, always within a safe calorie floor.',
    bg: 'from-[#fdead0] to-[#fbf2e2]',
    iconColor: 'text-primary-deep',
  },
  {
    icon: FlaskConical,
    title: 'Science-Based Math',
    description: 'Built on the Mifflin-St Jeor equation, not guesswork.',
    bg: 'from-[#fbe0e6] to-[#fdf0f2]',
    iconColor: 'text-[#c65a7e]',
  },
  {
    icon: ShieldCheckIcon as unknown as typeof UtensilsCrossed,
    title: 'Your Data, Your Control',
    description: "Nothing about your body goes anywhere it shouldn't.",
    bg: 'from-[#e6ede6] to-[#f3f6f3]',
    iconColor: 'text-[#5a7a5a]',
  },
];

const ANIMATED_ICONS: (typeof UtensilsCrossed)[] = [
  GaugeIcon as unknown as typeof UtensilsCrossed,
  ShieldCheckIcon as unknown as typeof UtensilsCrossed,
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  const animated = ANIMATED_ICONS.includes(Icon);
  return (
    // Layered shadow (tight contact + soft ambient) instead of one flat
    // value, a subtle top-light inset on the icon tile, and a hover lift —
    // small, deliberate details rather than a single generic card style.
    // The lift is done via Motion, not a Tailwind hover: class — a
    // comma-separated arbitrary box-shadow value silently failed to
    // generate under `hover:`, confirmed by comparing against a plain
    // `hover:underline` elsewhere on the page, which worked fine.
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col gap-4 rounded-xl border border-black/[0.04] bg-gradient-to-br p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_20px_-10px_rgba(0,0,0,0.1)] ${feature.bg}`}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.05)]">
        {animated ? (
          <Icon className={feature.iconColor} size={22} />
        ) : (
          <Icon
            className={`size-[22px] ${feature.iconColor}`}
            strokeWidth={1.75}
          />
        )}
      </div>
      <h3 className="font-display text-pretty text-[19px] font-semibold text-text">
        {feature.title}
      </h3>
      <p className="font-sans text-[14px] leading-[1.4] text-text/70">
        {feature.description}
      </p>
    </motion.div>
  );
}

export function AnalyticsSlide() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.95', 'start 0.5'],
  });
  const rawScale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);
  const scale = shouldReduceMotion ? 1 : rawScale;

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28"
    >
      <motion.div
        style={{ scale }}
        className="relative overflow-visible rounded-[32px] border border-black/[0.03] bg-[#fafaf7] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-10"
      >
        <h2 className="max-w-md font-display text-pretty text-[clamp(26px,4vw,34px)] font-semibold text-text">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.08}>
              <FeatureCard feature={f} />
            </ScrollReveal>
          ))}
        </div>

        <MascotPeek
          src="/mascot/foodnotemascotpeaking.avif"
          className="-top-10 -right-6 size-28 sm:size-36"
        />
      </motion.div>
    </div>
  );
}
