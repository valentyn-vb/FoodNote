'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import type { WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerContent,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { WeightHistoryRow } from '@/components/weight-history-row';

// Reuses the Drawer primitive from WeightDrawer — "edit/delete from the
// trend context" (#36) opens this rather than adding a second list column
// that the dashboard's fixed h-screen grid has no room for.
export function WeightHistoryDrawer({
  entries,
  onWeightsChanged,
  triggerClassName,
}: {
  entries: WeightEntryResponse[];
  onWeightsChanged: () => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const sorted = [...entries].sort((a, b) =>
    b.recordedAt.localeCompare(a.recordedAt),
  );

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger
        aria-label="Edit weight history"
        className={triggerClassName}
      >
        <History size={16} />
      </DrawerTrigger>
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        {/* DrawerTitleBar (#39) is this exact header; main restated it inline,
            hardcoded icon colour included. */}
        <DrawerTitleBar>Weight history</DrawerTitleBar>
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto px-5 py-4">
          {sorted.length === 0 && (
            <p className="font-sans text-caption text-text-muted">
              No entries yet.
            </p>
          )}
          {sorted.map((entry) => (
            <WeightHistoryRow
              key={entry.id}
              entry={entry}
              canDelete={sorted.length > 1}
              onChanged={onWeightsChanged}
            />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
