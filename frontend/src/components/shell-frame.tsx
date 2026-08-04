import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The (app) shell's page frame: full width until 1536, centred after it.
 *
 * A component rather than a utility repeated twice, because both the header row
 * and the page content have to use the *same* cap — otherwise the actions in the
 * header keep running to the far edge while the content below stops, and the
 * two read as different pages. Above the cap both frames centre on the same
 * axis at the same width, so their edges line up exactly.
 *
 * `max-w-8xl` is 96rem, a token this project adds because tailwind's own scale
 * stops at 80rem. It is wider than the 1150px of content a 1440 display gives,
 * so nothing about the verified widths changes; it only stops the growth beyond
 * them, where a four-card row would otherwise stretch a stat across a third of
 * a 4K screen.
 *
 * 96rem and not the 80rem it started at: on a 2560 display an 80rem frame left
 * ~640px of empty page on either side, which reads as a layout that failed
 * rather than as one that chose to stop (#143 review). The cap is not a
 * breakpoint — nothing rearranges at it, the cards only stop widening — so it
 * is not one of the three steps AGENTS.md names.
 *
 * The cap belongs here and not on a route (AGENTS.md): a page that caps itself
 * is what left /profile a 576px column against the left edge of 1440.
 */
export function ShellFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-8xl', className)}>{children}</div>
  );
}
