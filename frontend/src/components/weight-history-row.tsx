'use client';

import { useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WeightEntryResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { weights } from '@/lib/api-client';
import { formatEntryDate } from '@/lib/dashboard-transforms';
import { CARD_CLASS } from '@/app/(app)/dashboard/helpers';
import { WeightDrawer } from './weight-drawer';

export function WeightHistoryRow({
  entry,
  canDelete,
  onChanged,
}: {
  entry: WeightEntryResponse;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    try {
      await weights.remove(entry.id);
      onChanged();
      toast.success('Entry deleted');
    } catch {
      toast.error("Couldn't delete this entry. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Card
      className={`${CARD_CLASS} flex-row items-center justify-between px-4 py-3`}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-sans text-label font-semibold text-text [font-variant-numeric:tabular-nums]">
          {entry.weightKg} kg
        </div>
        <div className="font-sans text-[12px] text-text-muted">
          {formatEntryDate(entry.recordedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <WeightDrawer
          mode="edit"
          entry={entry}
          onChanged={onChanged}
          triggerLabel="Edit entry"
          triggerClassName="flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-[#F0EEE9]"
        >
          <Pencil size={16} />
        </WeightDrawer>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete entry"
          // Stated as the constraint, not as a claim about the journal:
          // `canDelete` is derived from the provider's 60-day window, so an
          // older entry outside it would make "your only entry" false. The
          // rule belongs in weights.service.remove() — this only fails closed.
          title={
            canDelete ? undefined : 'Your dashboard needs at least one weight'
          }
          disabled={busy || !canDelete}
          className="text-text-muted"
          onClick={handleDelete}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </Button>
      </div>
    </Card>
  );
}
