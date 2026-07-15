import type { Metadata } from 'next';
import { Figtree, Fredoka, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-display' });

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
      className={cn(
        'h-full',
        'antialiased',
        geistMono.variable,
        'font-sans',
        figtree.variable,
        fredoka.variable,
      )}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes into <body> before hydration — harmless, but noisy in dev. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
