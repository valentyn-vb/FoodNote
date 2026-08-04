'use client';

import { useEffect, useTransition, type ReactElement } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type WeightEntryResponse } from '@foodnote/shared';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerTitleBar,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { saveWeight, updateWeight } from '@/lib/actions/weights';
import { useControllableState } from '@/hooks/use-controllable-state';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query';
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
// copy, and validation regex (review on #36). "Log weight" (app header, mobile
// bar) and "Edit entry" (weight history row) are the same surface.
type WeightLogDrawerTrigger = {
  /**
   * The whole button that opens it — variant, size, layout, icon, label and
   * `aria-label` all belong to the caller. Same contract as `MealLogDrawer`.
   * Omit it when driving `open` yourself: the caller then owns the trigger
   * outright, and an empty one here would sit in the tab order.
   */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// No `onWeightSaved` or `onChanged` any more. Both existed to tell the rest of
// the app that this drawer had written something — the trend, the change stats,
// the goal tile and the calorie target all derive from the journal — and the
// action revalidates the routes that draw them instead. A caller that wanted to
// know is a caller that no longer has to.
type WeightLogDrawerProps = WeightLogDrawerTrigger &
  (
    | { mode: 'create' }
    | {
        mode: 'edit';
        entry: WeightEntryResponse;
      }
  );

export function WeightLogDrawer(props: WeightLogDrawerProps) {
  const { mode, trigger, open: controlledOpen, onOpenChange } = props;
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [open, setOpen] = useControllableState(
    controlledOpen,
    onOpenChange,
    false,
  );
  const [saving, startSaving] = useTransition();
  const form = useForm<WeightFormValues>({
    resolver: zodResolver(weightFormSchema),
  });

  const { reset } = form;
  const entry = mode === 'edit' ? props.entry : undefined;
  // Seeding on the `open` value rather than inside an onOpenChange handler:
  // when the caller drives `open` (the desktop sidebar's Log weight), no
  // handler of ours ever runs, so the form kept whatever the last mount left
  // in it and submitting did nothing (#119).
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

  function handleSubmit(values: WeightFormValues) {
    const weightKg = parsedWeightKg(values);

    startSaving(async () => {
      if (mode === 'create') {
        // Always "now" at submit time, not whenever the drawer was opened —
        // the date field isn't shown for create, so its form value is
        // decorative and must not be what actually gets sent.
        const result = await saveWeight({
          weightKg,
          recordedAt: new Date().toISOString(),
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success('Weight logged', {
          icon: (
            <Image src="/mascot/celebrate.webp" alt="" width={24} height={24} />
          ),
        });
      } else {
        // Only send recordedAt if the user actually changed it. The date
        // field is minute-precision, so resending it unconditionally would
        // silently zero out the entry's original seconds on every edit,
        // even one that only touched the weight (review on #36).
        const original = toDatetimeLocal(props.entry.recordedAt);
        const result = await updateWeight(props.entry.id, {
          weightKg,
          ...(values.recordedAt !== original && {
            recordedAt: new Date(values.recordedAt).toISOString(),
          }),
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
      }
      setOpen(false);
    });
  }

  const title = mode === 'create' ? 'Log weight' : 'Edit weight';

  // The two branches below share these three, per shadcn's responsive-dialog
  // example: one piece of open state, one form, one set of controls, rendered
  // into whichever container the width calls for.
  const body = (
    <DrawerBody>
      <WeightForm
        form={form}
        onSubmit={handleSubmit}
        showDate={mode === 'edit'}
      />
    </DrawerBody>
  );
  // `lg` is the app's CTA step (48px), the same height as the weight field
  // above it. The default 36px left the primary action shorter than its own
  // input, and the `py-3.5` that used to stand in for it did nothing against a
  // fixed height.
  const submit = (
    <Button
      type="submit"
      form={WEIGHT_FORM_ID}
      size="lg"
      disabled={saving}
      className="w-full"
    >
      {saving && <Spinner />}
      {mode === 'create' ? 'Save weight' : 'Save'}
    </Button>
  );
  // Nothing to render when the caller drives `open` itself.
  const showTrigger = controlledOpen === undefined && trigger;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {showTrigger && <DialogTrigger render={trigger} />}
        {/* `p-0 gap-0` and a flex column, so the body scrolls between a pinned
            header and footer exactly as it does in the sheet — the stock
            `grid gap-6 p-6` would have padded the popup and the body both, and
            a long form would grow the popup instead of scrolling inside it. */}
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            {/* Clears the stock close button at `top-4 right-4`. */}
            <DialogTitle className="pr-10">{title}</DialogTitle>
          </DialogHeader>
          {body}
          {/* `pt-2` on top of the body's own `pb-4`: the save button needs to
              read as the end of the form, not as the next line of it. */}
          <DialogFooter className="items-center gap-2 p-4 pt-2 pb-5">
            {submit}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      {showTrigger && <DrawerTrigger render={trigger} />}
      <DrawerContent>
        {/* #39 factored this header — centred title plus close button — into
            DrawerTitleBar; main had restated it inline, hardcoded icon colour
            included. */}
        <DrawerTitleBar>{title}</DrawerTitleBar>
        {body}
        {/* The meal steps' footer, to the class: one full-width CTA, `gap-2`,
            and the `pb-5` that keeps it off the home indicator. `pt-2` on top of
            the body's own `pb-4`, so the button reads as the end of the form
            rather than as the next line of it. */}
        <DrawerFooter className="items-center gap-2 pt-2 pb-5">
          {submit}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
