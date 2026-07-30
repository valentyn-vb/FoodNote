'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { WeightEntryResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { Spinner } from '@/components/ui/spinner';
import { weights } from '@/lib/api-client';
import { formatEntryDate } from '@/lib/dashboard-transforms';
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
    // The same object as MealRow, so the same component.
    <ListRow
      title={`${entry.weightKg} kg`}
      numeric
      meta={formatEntryDate(entry.recordedAt)}
      end={
        <>
          <WeightDrawer
            mode="edit"
            entry={entry}
            onChanged={onChanged}
            triggerLabel="Edit entry"
            trigger={<Button variant="ghost" size="icon-sm" />}
          >
            <Pencil size={16} />
          </WeightDrawer>
          <Button
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
            onClick={handleDelete}
          >
            {busy ? <Spinner /> : <Trash2 size={16} />}
          </Button>
        </>
      }
    />
  );
}
