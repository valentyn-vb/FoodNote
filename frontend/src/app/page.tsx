import { Instrument_Serif } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SiteNav } from '@/components/marketing/site-nav';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { CoverSlide } from '@/components/marketing/slides/cover-slide';
import { IntroSlide } from '@/components/marketing/slides/intro-slide';
import { AnalyticsSlide } from '@/components/marketing/slides/analytics-slide';
import { QuoteSlide } from '@/components/marketing/slides/quote-slide';
import { OutroSlide } from '@/components/marketing/slides/outro-slide';

// Scoped to this route (not the root layout): a single serif-italic accent
// font, used sparingly by CoverSlide/QuoteSlide/OutroSlide, not a wholesale
// brand font swap. Every other route (dashboard, login, onboarding...)
// would otherwise download a font it never renders.
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: 'italic',
  subsets: ['latin'],
  variable: '--font-accent-serif',
});

export default function Home() {
  return (
    <main className={cn('overflow-x-clip bg-bg', instrumentSerif.variable)}>
      <SiteNav />
      <CoverSlide />
      <ScrollReveal>
        <IntroSlide />
      </ScrollReveal>
      <ScrollReveal>
        <QuoteSlide />
      </ScrollReveal>
      <ScrollReveal>
        <AnalyticsSlide />
      </ScrollReveal>
      <ScrollReveal>
        <OutroSlide />
      </ScrollReveal>
    </main>
  );
}
