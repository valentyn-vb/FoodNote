import Link from 'next/link';
import { Mascot } from '@/components/mascot';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * The 404, which until now was Next's own — an unstyled page outside every screen
 * this app draws.
 *
 * Whoever reads it is signed in. `proxy.ts` treats anything outside `/`, `/login`
 * and `/register` as needing a session, so a stranger following a dead link is
 * bounced to `/login` and never arrives here; the one who does has a session and a
 * dashboard to go back to. So this offers that, rather than the landing page.
 *
 * It renders inside the root layout — the fonts, the tokens and the appearance
 * attribute are already there — but not inside `(app)/layout.tsx`: a route group's
 * layout wraps only its own segments, and a path that matches no segment has no
 * shell. No sidebar and no header here, and none of the reads they need.
 */
export default function NotFound() {
  return (
    <Empty className="min-h-svh">
      <EmptyHeader>
        <EmptyMedia>
          {/* An expression, not one of the two square drawings: those are opaque
              and bleed off their bottom edge, so they need `MascotDisc`'s cream
              frame and read as a cream box without it. */}
          <Mascot src="/mascot/accompany.webp" className="w-18" priority />
        </EmptyMedia>
        <EmptyTitle>Nothing here</EmptyTitle>
        <EmptyDescription>
          This page doesn&apos;t exist. Your days are where you left them.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: 'outline' })}
        >
          Back to dashboard
        </Link>
      </EmptyContent>
    </Empty>
  );
}
