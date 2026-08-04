'use client';

import { useState, type ReactElement } from 'react';
import type { WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerContent,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { WeightHistoryRow } from '@/components/weight-history-row';

// Reuses the Drawer primitive from WeightLogDrawer — "edit/delete from the
// trend context" (#36) opens this rather than adding a second list column
// that the dashboard's fixed h-screen grid has no room for.
export function WeightHistoryDrawer({
  entries,
  trigger,
}: {
  entries: WeightEntryResponse[];
  /** The element the drawer opens from, so its look stays in a ui/ component. */
  trigger: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...entries].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger aria-label="Edit weight history" render={trigger} />
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        {/* DrawerTitleBar (#39) is this exact header; main restated it inline,
            hardcoded icon colour included. */}
        <DrawerTitleBar>Weight history</DrawerTitleBar>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-5 py-4">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          )}
          {sorted.map((entry) => (
            <WeightHistoryRow
              key={entry.id}
              entry={entry}
              // Still the fetched window's count rather than the journal's, so
              // a user with one entry inside 60 days and more outside it is
              // offered a delete Nest will refuse. Unchanged by this migration:
              // the contract carries no total, and the refusal is handled.
              canDelete={sorted.length > 1}
            />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
