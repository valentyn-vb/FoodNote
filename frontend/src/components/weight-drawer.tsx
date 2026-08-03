'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type WeightEntryResponse } from '@foodnote/shared';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { weights } from '@/lib/api-client';
import { useControllableState } from '@/hooks/use-controllable-state';
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
// Either renders its own trigger from `children`, or runs controlled via
// `open`/`onOpenChange` so a caller can supply a trigger of its own — which is
// how the sidebar uses a real SidebarMenuButton (tooltip in the collapsed rail
// included) instead of restating that button's classes (#39).
type WeightDrawerTrigger = {
  triggerClassName?: string;
  triggerLabel?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type WeightDrawerProps = WeightDrawerTrigger &
  (
    | {
        mode: 'create';
        onWeightSaved?: (entry: WeightEntryResponse) => void;
      }
    | {
        mode: 'edit';
        entry: WeightEntryResponse;
        onChanged: () => void;
      }
  );

export function WeightDrawer(props: WeightDrawerProps) {
  const {
    mode,
    triggerClassName,
    triggerLabel,
    children,
    open: controlledOpen,
    onOpenChange,
  } = props;
  const [open, setOpen] = useControllableState(
    controlledOpen,
    onOpenChange,
    false,
  );
  const [saving, setSaving] = useState(false);
  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightFormSchema),
  });
  const { reset } = form;
  const entry = mode === 'edit' ? props.entry : undefined;
  useEffect(() => {
    if (!open) return;
    reset(
      entry
        ? {
            weightKg: String(entry.weightKg),
            recordedAt: toDatetimeLocal(entry.recordedAt),
          }
        : {
            weightKg: '',
            recordedAt: toDatetimeLocal(new Date().toISOString()),
          },
    );
  }, [open, entry, reset]);

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
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      {/* Nothing to render when the caller drives `open` itself: it brought its
          own trigger, and an empty one here would sit in the tab order. */}
      {controlledOpen === undefined && (
        <DrawerTrigger aria-label={triggerLabel} className={triggerClassName}>
          {children ?? (mode === 'create' ? 'Log weight' : undefined)}
        </DrawerTrigger>
      )}
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        {/* #39 factored this header — centred title plus close button — into
            DrawerTitleBar; main had restated it inline, hardcoded icon colour
            included. */}
        <DrawerTitleBar>
          {mode === 'create' ? 'Log weight' : 'Edit weight'}
        </DrawerTitleBar>
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
