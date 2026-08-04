import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The (app) shell's page frame. Full width at every size — the team's call, on
 * review of #143: a display wide enough to show more should show more, and the
 * empty margins a cap leaves read as a layout that failed rather than as one
 * that chose to stop.
 *
 * Still a component rather than nothing, because the header row and the page
 * content have to keep agreeing about their frame: they line up today only
 * because both ask the same place what it is. Anything the frame gains later —
 * a cap, a gutter, a max measure for one route — is one edit here rather than
 * two that can drift apart. It is deliberately thin, not accidentally so.
 *
 * Whatever it becomes, it belongs here and not on a route (AGENTS.md): a page
 * that frames itself is what left /profile a 576px column against the left edge
 * of 1440.
 */
export function ShellFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('w-full', className)}>{children}</div>;
}
