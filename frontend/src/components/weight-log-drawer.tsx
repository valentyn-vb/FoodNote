'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { weightKgSchema, type WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { weights } from '@/lib/api-client';
import { useControllableState } from '@/hooks/use-controllable-state';

/**
 * Renders its own trigger when given `children`, or runs controlled via
 * `open`/`onOpenChange` so a caller can supply a trigger of its own — which is
 * how the sidebar uses a real SidebarMenuButton instead of restating its
 * classes.
 */
export function WeightLogDrawer({
  onWeightSaved,
  open: controlledOpen,
  onOpenChange,
  triggerClassName,
  children,
}: {
  onWeightSaved?: (entry: WeightEntryResponse) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useControllableState(
    controlledOpen,
    onOpenChange,
    false,
  );
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next)
      setTimeout(() => {
        setValue('');
        setError(null);
      }, 300);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Comma decimals ("71,4") are common on EU keyboards.
    const parsed = weightKgSchema.safeParse(Number(value.replace(',', '.')));
    if (!value.trim() || !parsed.success) {
      setError('Enter a weight between 30 and 300 kg.');
      return;
    }
    setSaving(true);
    try {
      const created = await weights.create({
        weightKg: parsed.data,
        recordedAt: new Date().toISOString(),
      });
      setOpen(false);
      setValue('');
      toast.success('Weight logged', {
        icon: (
          <Image src="/mascot/celebrate.webp" alt="" width={24} height={24} />
        ),
      });
      onWeightSaved?.(created);
    } catch {
      toast.error("Couldn't save your weight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      responsiveSide
      showSwipeHandle
    >
      {children && (
        <DrawerTrigger className={triggerClassName}>{children}</DrawerTrigger>
      )}
      <DrawerContent>
        <DrawerTitleBar>Log weight</DrawerTitleBar>
        <form onSubmit={handleSave}>
          <div className="flex flex-col gap-3 px-5 pt-2">
            <DrawerDescription className="font-sans text-caption font-medium text-text">
              Today&apos;s weight (kg)
            </DrawerDescription>
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
              placeholder="e.g. 71.4"
              aria-invalid={!!error}
              className="h-12 text-center font-display text-[22px] font-semibold [font-variant-numeric:tabular-nums]"
            />
            {error && (
              <p role="alert" className="font-sans text-[12px] text-error">
                {error}
              </p>
            )}
            <div className="font-sans text-[12px] text-text-muted">
              Each save adds a new entry to your weight journal.
            </div>
          </div>
          <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
            <Button type="submit" disabled={saving} variant="cta" size="cta">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save weight
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
