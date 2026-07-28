'use client';

import { useState } from 'react';
import { History, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { weightKgSchema, type WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { weights } from '@/lib/api-client';
import { CARD_CLASS } from './helpers';

function formatEntryDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

// <input type="datetime-local"> has no timezone of its own — it's read/written
// in the browser's local time, matching formatEntryDate's display above.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function WeightHistoryRow({
  entry,
  canDelete,
  onChanged,
}: {
  entry: WeightEntryResponse;
  canDelete: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(entry.weightKg));
  const [recordedAt, setRecordedAt] = useState(
    toDatetimeLocal(entry.recordedAt),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setValue(String(entry.weightKg));
    setRecordedAt(toDatetimeLocal(entry.recordedAt));
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    // Comma decimals ("71,4") are common on EU keyboards.
    const parsed = weightKgSchema.safeParse(Number(value.replace(',', '.')));
    if (!parsed.success) {
      setError('Enter a weight between 30 and 300 kg.');
      return;
    }
    if (!recordedAt) {
      setError('Pick a date and time.');
      return;
    }
    setBusy(true);
    try {
      await weights.update(entry.id, {
        weightKg: parsed.data,
        recordedAt: new Date(recordedAt).toISOString(),
      });
      onChanged();
      setEditing(false);
    } catch {
      toast.error("Couldn't save your weight. Please try again.");
    } finally {
      setBusy(false);
    }
  }

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

  if (editing) {
    return (
      <Card className={`${CARD_CLASS} flex-col gap-2 px-4 py-3`}>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => {
              const next = e.target.value;
              if (/^\d{0,3}([.,]\d?)?$/.test(next)) {
                setValue(next);
                setError(null);
              }
            }}
            aria-invalid={!!error}
            className="h-9 w-20 text-center font-display text-[16px] font-semibold [font-variant-numeric:tabular-nums]"
          />
          <Input
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => {
              setRecordedAt(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            className="h-9 grow text-[13px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="cta"
            className="h-9 grow px-3"
            disabled={busy}
            onClick={handleSave}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 grow px-3"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-sans text-[12px] text-error">
            {error}
          </p>
        )}
      </Card>
    );
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
        <button
          type="button"
          aria-label="Edit entry"
          disabled={busy}
          className="flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-[#F0EEE9]"
          onClick={startEdit}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          aria-label="Delete entry"
          // Stated as the constraint, not as a claim about the journal:
          // `canDelete` is derived from the provider's 60-day window, so an
          // older entry outside it would make "your only entry" false. The
          // rule belongs in weights.service.remove() — this only fails closed.
          title={
            canDelete ? undefined : 'Your dashboard needs at least one weight'
          }
          disabled={busy || !canDelete}
          className="flex size-8 items-center justify-center rounded-sm text-text-muted hover:bg-[#F0EEE9] disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={handleDelete}
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      </div>
    </Card>
  );
}

// Reuses the Drawer primitive from WeightLogDrawer — "edit/delete from the
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
