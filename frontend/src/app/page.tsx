import { Instrument_Serif } from 'next/font/google';
import './landing.css';
import { cn } from '@/lib/utils';
import { SiteNav } from '@/components/marketing/site-nav';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { CoverSlide } from '@/components/marketing/slides/cover-slide';
import { IntroSlide } from '@/components/marketing/slides/intro-slide';
import { AnalyticsSlide } from '@/components/marketing/slides/analytics-slide';
import { QuoteSlide } from '@/components/marketing/slides/quote-slide';
import { OutroSlide } from '@/components/marketing/slides/outro-slide';
import { verifySession } from '@/lib/server/session';

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

/**
 * Session-aware, and therefore dynamically rendered — a named cost, not an
 * oversight. `AuthProvider` used to answer "is anyone signed in" from a client
 * effect on the most visited page in the app, which meant a flash and a fetch;
 * with it gone the page reads the cookie itself. `verifySession` is a local
 * `exp` decode, so this costs no network and touches neither Nest nor Render: the
 * page is served by a function instead of from the CDN, and the HTML is still
 * complete, so SEO is unaffected.
 *
 * The answer is threaded down as a prop rather than through a context: it is
 * server data, and three components want it.
 */
export default async function Home() {
  const authed = (await verifySession()) !== null;

  return (
    <main className={cn('overflow-x-clip', instrumentSerif.variable)}>
      <SiteNav authed={authed} />
      <CoverSlide authed={authed} />
      <ScrollReveal>
        <IntroSlide />
      </ScrollReveal>
      <QuoteSlide />
      <ScrollReveal>
        <AnalyticsSlide />
      </ScrollReveal>
      <ScrollReveal>
        <OutroSlide authed={authed} />
      </ScrollReveal>
    </main>
  );
}
