import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Figtree, Fredoka } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import {
  APPEARANCE_ATTRIBUTE,
  APPEARANCE_COOKIE,
  appearanceOrDefault,
} from '@/lib/appearance';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-display' });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'FoodNote',
  description:
    'Weight-loss planning and calorie tracking with AI-assisted meal logging.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the app shell because only this layout renders
  // <html>, and the attribute has to be on it before the first paint — the page
  // background is painted from a token long before React runs, so a client-side
  // apply is a flash of the wrong appearance, not a late one.
  //
  // The cost is real and deliberate: `cookies()` is a request-time API, so every
  // route — the marketing page included — renders dynamically from here on. It
  // is the first thing in this app to opt out of static rendering. See ADR 0014.
  const appearance = appearanceOrDefault(
    (await cookies()).get(APPEARANCE_COOKIE)?.value,
  );

  return (
    <html
      lang="en"
      {...{ [APPEARANCE_ATTRIBUTE]: appearance }}
      // Browser extensions (LanguageTool etc.) mutate <html> attributes before
      // hydration; suppress attribute-mismatch noise on this element only.
      suppressHydrationWarning
      // Only the font-face variables and the layout height: `font-sans` and
      // `antialiased` live in @layer base in globals.css, so no element has to
      // restate them.
      className={cn('h-full', figtree.variable, fredoka.variable)}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes into <body> before hydration — harmless, but noisy in dev. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Nothing session-shaped wraps the app any more: `(auth)` and the
            marketing landing carry none of it, and session knowledge appears
            only where it is used. */}
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
