import type { Metadata } from 'next';
import {
  Figtree,
  Fredoka,
  Geist_Mono,
  Instrument_Serif,
} from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-display' });

// Homepage only (ticket #58) — a single serif-italic accent font, used
// sparingly (the quote section), not a wholesale font swap of the brand.
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: 'italic',
  subsets: ['latin'],
  variable: '--font-accent-serif',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FoodNote',
  description:
    'Weight-loss planning and calorie tracking with AI-assisted meal logging.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Browser extensions (LanguageTool etc.) mutate <html> attributes before
      // hydration; suppress attribute-mismatch noise on this element only.
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistMono.variable,
        'font-sans',
        figtree.variable,
        fredoka.variable,
        instrumentSerif.variable,
      )}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes into <body> before hydration — harmless, but noisy in dev. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
