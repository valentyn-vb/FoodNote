'use client';

import { useState } from 'react';
import { History, X } from 'lucide-react';
import type { WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
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
        <DrawerHeader className="grid grid-cols-[1fr_auto_1fr] items-center">
          <DrawerTitle className="col-start-2 justify-self-center font-sans text-[15px] font-semibold text-text">
            Weight history
          </DrawerTitle>
          <DrawerClose
            aria-label="Close drawer"
            className="col-start-3 flex size-5 items-center justify-self-end justify-center"
          >
            <X size={20} className="text-[#333333]" strokeWidth={2} />
          </DrawerClose>
        </DrawerHeader>
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
