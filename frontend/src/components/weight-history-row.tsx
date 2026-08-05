'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { deleteWeight } from '@/lib/actions/weights';
import { formatEntryDate } from '@/lib/dashboard-transforms';
import type { WeightEntryResponse } from '@foodnote/shared';
// The `*Icon` names and no explicit `size`, as meal-line's pair does: the button
// base already sizes a bare svg to `size-4`, so `size={16}` was the same 16px
// spelled a second way — and only on this row.
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { WeightLogDrawer } from './weight-log-drawer';

export function WeightHistoryRow({
  entry,
  canDelete,
}: {
  entry: WeightEntryResponse;
  canDelete: boolean;
}) {
  const [busy, startDelete] = useTransition();

  // `onChanged` is gone: it told the drawer's owner to refetch the journal, and
  // the action revalidates the routes that draw it.
  function handleDelete() {
    startDelete(async () => {
      const result = await deleteWeight(
        entry.id,
        "Couldn't delete this entry. Please try again.",
      );
      if (result.ok) toast.success('Entry deleted');
      else toast.error(result.message);
    });
  }

  return (
    // One line of the journal, and now only on /weights: the dashboard's
    // history drawer is gone, replaced by a link to that page. `shrink-0` is
    // kept rather than dropped with it — the rows sit in a flex column either
    // way, and a row that squashes instead of holding its height is what the
    // fixed size prevents. Tighter radius than the card default: 20px on a 64px
    // row reads as a pill.
    <Card className="shrink-0 flex-row items-center justify-between gap-3 rounded-md px-4 py-3.5">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-semibold tabular-nums">
          {entry.weightKg} kg
        </div>
        <div className="text-sm text-muted-foreground">
          {formatEntryDate(entry.recordedAt)}
        </div>
      </div>
      {/* `gap-3`, as in meal-line: two 44px touch targets on 32px icons
          need 12px between them to stop overlapping. */}
      <div className="flex shrink-0 items-center gap-3">
        <WeightLogDrawer
          mode="edit"
          entry={entry}
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit entry"
              className="touch-target text-muted-foreground"
            >
              <PencilIcon />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="touch-target text-muted-foreground"
          aria-label="Delete entry"
          // Stated as the constraint, not as a claim about the journal:
          // `canDelete` counts only the entries in the window on screen, so an
          // older entry outside the chosen range makes "your only entry" false.
          // The rule belongs in weights.service.remove(); this only fails closed.
          title={
            canDelete ? undefined : 'Your dashboard needs at least one weight'
          }
          disabled={busy || !canDelete}
          onClick={handleDelete}
        >
          {busy ? <Spinner /> : <Trash2Icon />}
        </Button>
      </div>
    </Card>
  );
}
