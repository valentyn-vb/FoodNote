import { SiteNav } from '@/components/marketing/site-nav';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { CoverSlide } from '@/components/marketing/slides/cover-slide';
import { IntroSlide } from '@/components/marketing/slides/intro-slide';
import { AnalyticsSlide } from '@/components/marketing/slides/analytics-slide';
import { QuoteSlide } from '@/components/marketing/slides/quote-slide';
import { OutroSlide } from '@/components/marketing/slides/outro-slide';

export default function Home() {
  return (
    <main className="overflow-x-clip bg-bg">
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
