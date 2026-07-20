'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { weightKgSchema } from '@foodnote/shared';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { weights } from '@/lib/api-client';

const CTA_CLASS =
  'w-full rounded-sm bg-primary py-3.5 text-surface shadow-[0_2px_8px_#f5a65c59]';

export function WeightLogDrawer({
  onWeightSaved,
  triggerClassName,
  children = 'Log weight',
}: {
  onWeightSaved?: (weightKg: number) => void;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    // Comma decimals ("71,4") are common on EU keyboards.
    const parsed = weightKgSchema.safeParse(Number(value.replace(',', '.')));
    if (!value.trim() || !parsed.success) {
      setError('Enter a weight between 30 and 300 kg.');
      return;
    }
    setSaving(true);
    try {
      const { updated } = await weights.create({
        weightKg: parsed.data,
        recordedAt: new Date().toISOString(),
      });
      setOpen(false);
      setValue('');
      toast.success(updated ? "Updated today's weight" : 'Weight logged', {
        icon: (
          <Image src="/mascot/celebrate.webp" alt="" width={24} height={24} />
        ),
      });
      onWeightSaved?.(parsed.data);
    } catch {
      toast.error("Couldn't save your weight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next)
          setTimeout(() => {
            setValue('');
            setError(null);
          }, 300);
      }}
      showSwipeHandle
    >
      <DrawerTrigger className={triggerClassName}>{children}</DrawerTrigger>
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        <DrawerHeader className="flex-row items-center justify-between">
          <div className="size-5" />
          <DrawerTitle className="font-sans text-[15px] font-semibold text-text">
            Log weight
          </DrawerTitle>
          <DrawerClose className="flex size-5 items-center justify-center">
            <X size={20} className="text-[#333333]" strokeWidth={2} />
          </DrawerClose>
        </DrawerHeader>
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
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
            One entry per day — saving again replaces today&apos;s weight.
          </div>
        </div>
        <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
          <Button onClick={handleSave} disabled={saving} className={CTA_CLASS}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save weight
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
