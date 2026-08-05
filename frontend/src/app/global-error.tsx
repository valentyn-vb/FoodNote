'use client';

import { Figtree } from 'next/font/google';
import './globals.css';
import { Mascot } from '@/components/mascot';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * The boundary for the root layout, which `app/error.tsx` cannot be: `error.tsx`
 * never wraps the layout beside it, and the root layout is the one that reads the
 * appearance cookie and loads the two faces. When it throws, this file replaces
 * it — document and all — instead of Next's built-in 500, which is a white page
 * with a system font.
 *
 * Replacing the root layout means nothing it provides arrives here, which is why
 * this file imports the stylesheet and a font of its own: a component tree's CSS
 * comes from what that tree imports, and this tree no longer contains
 * `layout.tsx`. Only `--font-sans` — there is no display-scale type on this
 * screen, so Fredoka would be a download for nothing on the worst request of
 * someone's day.
 *
 * `<html>` carries no `data-appearance`, and that is correct rather than a gap:
 * the attribute comes from a cookie only a Server Component can read, and this is
 * a Client Component by rule. `globals.css` states the dark values twice — once
 * under `prefers-color-scheme: dark` for `:root:not([data-appearance='light'])`
 * (ADR 0014) — so with no attribute the OS setting decides, and someone in dark
 * mode is not flashed a white page while being told something went wrong.
 *
 * `retry()`, not `reset()`: this version distinguishes them, and only `retry`
 * re-fetches before re-rendering. What brought us here is a failed read, so
 * re-rendering the same data is not a recovery.
 */
const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en" className={`h-full ${figtree.variable}`}>
      {/* No `metadata` export is possible in a Client Component, so the tab's
          name is React's own <title>. */}
      <title>Something went wrong — FoodNote</title>
      <body className="min-h-full">
        <Empty className="min-h-svh">
          <EmptyHeader>
            <EmptyMedia>
              <Mascot src="/mascot/recover.webp" className="w-18" priority />
            </EmptyMedia>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>
              Nothing you logged is lost. Try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => retry()}>
              Try again
            </Button>
          </EmptyContent>
        </Empty>
      </body>
    </html>
  );
}
