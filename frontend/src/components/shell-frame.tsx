import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The (app) shell's page frame: full width until 1280, centred after it.
 *
 * A component rather than a utility repeated twice, because both the header row
 * and the page content have to use the *same* cap — otherwise the actions in the
 * header keep running to the far edge while the content below stops, and the
 * two read as different pages. Above the cap both frames centre on the same
 * axis at the same width, so their edges line up exactly.
 *
 * `max-w-7xl` is 80rem — wider than the 1150px of content a 1440 display gives,
 * so nothing about the verified widths changes; it only stops the growth beyond
 * them, where a four-card row would otherwise stretch a stat across a third of a
 * 4K screen.
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
    <div className={cn('mx-auto w-full max-w-7xl', className)}>{children}</div>
  );
}
