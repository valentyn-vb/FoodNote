'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { weights } from '@/lib/api-client';
import { toDatetimeLocal } from '@/lib/dashboard-transforms';
import {
  WEIGHT_FORM_ID,
  WeightForm,
  parsedWeightKg,
  weightFormSchema,
  type WeightFormValues,
} from './weight-form';

// One component, mode-switched, instead of a separate log-only drawer and a
// second in-row edit form: the two duplicated the same weight input, error
// copy, and validation regex (review on #36). "Log weight" (sidebar, mobile
// bar) and "Edit entry" (weight history row) are the same drawer.
type WeightDrawerProps =
  | {
      mode: 'create';
      onWeightSaved?: (entry: WeightEntryResponse) => void;
      triggerClassName?: string;
      triggerLabel?: string;
      children?: ReactNode;
    }
  | {
      mode: 'edit';
      entry: WeightEntryResponse;
      onChanged: () => void;
      triggerClassName?: string;
      triggerLabel?: string;
      children?: ReactNode;
    };

export function WeightDrawer(props: WeightDrawerProps) {
  const { mode, triggerClassName, triggerLabel, children } = props;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightFormSchema),
  });

  function handleOpenChange(next: boolean) {
    if (next) {
      form.reset(
        mode === 'edit'
          ? {
              weightKg: String(props.entry.weightKg),
              recordedAt: toDatetimeLocal(props.entry.recordedAt),
            }
          : {
              weightKg: '',
              recordedAt: toDatetimeLocal(new Date().toISOString()),
            },
      );
    }
    setOpen(next);
  }

  async function handleSubmit(values: WeightFormValues) {
    const weightKg = parsedWeightKg(values);
    setSaving(true);
    try {
      if (mode === 'create') {
        // Always "now" at submit time, not whenever the drawer was opened —
        // the date field isn't shown for create, so its form value is
        // decorative and must not be what actually gets sent.
        const created = await weights.create({
          weightKg,
          recordedAt: new Date().toISOString(),
        });
        toast.success('Weight logged', {
          icon: (
            <Image src="/mascot/celebrate.webp" alt="" width={24} height={24} />
          ),
        });
        props.onWeightSaved?.(created);
      } else {
        // Only send recordedAt if the user actually changed it. The date
        // field is minute-precision, so resending it unconditionally would
        // silently zero out the entry's original seconds on every edit,
        // even one that only touched the weight (review on #36).
        const original = toDatetimeLocal(props.entry.recordedAt);
        await weights.update(props.entry.id, {
          weightKg,
          ...(values.recordedAt !== original && {
            recordedAt: new Date(values.recordedAt).toISOString(),
          }),
        });
        props.onChanged();
      }
      setOpen(false);
    } catch {
      toast.error("Couldn't save your weight. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
      <DrawerTrigger aria-label={triggerLabel} className={triggerClassName}>
        {children ?? (mode === 'create' ? 'Log weight' : undefined)}
      </DrawerTrigger>
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        <DrawerHeader className="grid grid-cols-[1fr_auto_1fr] items-center">
          <DrawerTitle className="col-start-2 justify-self-center font-sans text-[15px] font-semibold text-text">
            {mode === 'create' ? 'Log weight' : 'Edit weight'}
          </DrawerTitle>
          <DrawerClose
            aria-label="Close drawer"
            className="col-start-3 flex size-5 items-center justify-self-end justify-center"
          >
            <X size={20} className="text-[#333333]" strokeWidth={2} />
          </DrawerClose>
        </DrawerHeader>
        <WeightForm
          form={form}
          onSubmit={handleSubmit}
          showDate={mode === 'edit'}
        />
        <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
          <Button
            type="submit"
            form={WEIGHT_FORM_ID}
            disabled={saving}
            variant="cta"
            className="w-full py-3.5"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {mode === 'create' ? 'Save weight' : 'Save'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
