'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
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
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CTA_CLASS =
  'w-full rounded-sm bg-primary py-3.5 text-surface shadow-[0_2px_8px_#f5a65c59]';

// Mock AI-parse result — stands in for POST /meals/ai-parse (see ticket #10).
// isFood is a naive heuristic so the not-food edge state (H07, mascot RECOVER)
// is reachable in this skeleton without a real backend.
const MOCK_PARSED_ITEMS = [
  { name: 'Chicken breast', qty: '180 g', kcal: 300 },
  { name: 'White rice', qty: '150 g', kcal: 195 },
  { name: 'Side salad', qty: '1 bowl', kcal: 75 },
  { name: 'Latte', qty: '1 cup', kcal: 150 },
];
const MOCK_TOTALS = { kcal: 720, protein: 63, carbs: 78, fat: 22 };

type Step = 'input' | 'loading' | 'preview' | 'not-food';

export function MealLogDrawer({
  onMealSaved,
  onMealUndone,
  triggerClassName,
  children = 'Log a meal',
}: {
  onMealSaved?: (kcal: number) => void;
  onMealUndone?: () => void;
  triggerClassName?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [description, setDescription] = useState(
    'Chicken breast with rice, a side salad, and a latte',
  );

  function reset() {
    setStep('input');
    setDescription('Chicken breast with rice, a side salad, and a latte');
  }

  function handleParse() {
    setStep('loading');
    const isFood = !description.toLowerCase().includes('car');
    setTimeout(() => setStep(isFood ? 'preview' : 'not-food'), 1200);
  }

  function handleConfirm() {
    setOpen(false);
    onMealSaved?.(MOCK_TOTALS.kcal);
    // CELEBRATE mascot moment (design doc: quiet, since it happens every meal)
    toast.success('Meal saved', {
      icon: (
        <Image src="/mascot/celebrate.webp" alt="" width={24} height={24} />
      ),
      action: { label: 'Undo', onClick: () => onMealUndone?.() },
    });
    setTimeout(reset, 300);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTimeout(reset, 300);
      }}
      showSwipeHandle
    >
      <DrawerTrigger
        className={cn(
          'h-12.5 grow-2 basis-0 rounded-sm bg-primary text-surface shadow-[0_2px_8px_#f5a65c59] lg:grow-0 lg:px-6',
          triggerClassName,
        )}
      >
        {children}
      </DrawerTrigger>

      {/* Full width on mobile (per review); capped and centered on desktop —
          an edge-to-edge sheet across a 1440px screen reads as broken. */}
      <DrawerContent className="lg:mx-auto lg:max-w-lg">
        {step === 'input' && (
          <>
            <DrawerHeader className="flex-row items-center justify-between">
              <div className="size-5" />
              <DrawerTitle className="font-sans text-[15px] font-semibold text-text">
                Log a meal
              </DrawerTitle>
              <DrawerClose className="flex size-5 items-center justify-center">
                <X size={20} className="text-[#333333]" strokeWidth={2} />
              </DrawerClose>
            </DrawerHeader>
            <div className="flex flex-col gap-3 px-5 pt-2">
              <DrawerDescription className="font-sans text-caption font-medium text-text">
                Describe what you ate
              </DrawerDescription>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="min-h-32.5 rounded-md border-[1.5px] border-primary bg-surface p-3.5 font-sans text-[14.5px] text-text shadow-[0_0_0_3px_#fdebd6] focus:outline-none"
              />
              <div className="font-sans text-[12px] text-text-muted">
                One meal at a time. Portions can be approximate — you&apos;ll
                review before saving.
              </div>
            </div>
            <DrawerFooter className="items-center gap-3.5 pt-4.5 pb-5">
              <Button onClick={handleParse} className={CTA_CLASS}>
                Parse with AI
              </Button>
              <Button
                variant="link"
                onClick={() =>
                  toast.info(
                    "Manual entry isn't wired up yet — this is a rough skeleton.",
                  )
                }
                className="h-auto p-0 text-caption text-text-muted"
              >
                Enter manually instead
              </Button>
            </DrawerFooter>
          </>
        )}

        {step === 'loading' && (
          <>
            <DrawerHeader>
              <DrawerTitle className="text-center font-sans text-[15px] font-semibold text-text">
                Log a meal
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col items-center justify-center gap-5 px-6 pt-16 pb-18">
              <div className="flex size-33 shrink-0 items-center justify-center rounded-full bg-[#FFF3E7]">
                <Image
                  src="/mascot/defaultlogo.png"
                  alt=""
                  width={104}
                  height={104}
                  className="size-26"
                />
              </div>
              <div className="font-sans text-[14.5px] font-medium text-text">
                Reading your meal…
              </div>
              <div className="h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-[#F0EEE9]">
                <div className="h-full w-[55%] rounded-full bg-primary" />
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <DrawerHeader className="flex-row items-center justify-between">
              <div className="size-5" />
              <DrawerTitle className="font-sans text-[15px] font-semibold text-text">
                Review your meal
              </DrawerTitle>
              <DrawerClose className="flex size-5 items-center justify-center">
                <X size={20} className="text-[#333333]" strokeWidth={2} />
              </DrawerClose>
            </DrawerHeader>
            <div className="flex min-h-0 flex-col gap-4.5 overflow-y-auto px-5 pt-1.5">
              <div className="flex flex-col gap-2">
                <DrawerDescription className="font-sans text-caption font-medium text-text">
                  Items
                </DrawerDescription>
                {MOCK_PARSED_ITEMS.map((item) => (
                  <Card
                    key={item.name}
                    className="flex-row items-center gap-2 rounded-sm border border-border bg-surface p-3 py-3 shadow-[0_1px_2px_#00000008] ring-0"
                  >
                    <div className="grow-2 basis-0 font-sans text-label font-medium text-text">
                      {item.name}
                    </div>
                    <div className="flex h-8.5 w-17 shrink-0 items-center justify-center rounded-[6px] border border-border">
                      <div className="font-sans text-[12.5px] text-text [font-variant-numeric:tabular-nums]">
                        {item.qty}
                      </div>
                    </div>
                    <div className="flex h-8.5 w-14 shrink-0 items-center justify-center rounded-[6px] border border-border">
                      <div className="font-sans text-[12.5px] text-text [font-variant-numeric:tabular-nums]">
                        {item.kcal}
                      </div>
                    </div>
                  </Card>
                ))}
                <Button
                  variant="link"
                  onClick={() =>
                    toast.info(
                      "Adding items isn't wired up yet — this is a rough skeleton.",
                    )
                  }
                  className="h-auto w-fit p-0 text-caption font-medium text-primary-deep no-underline"
                >
                  + Add item
                </Button>
              </div>

              <div className="flex gap-2">
                {[
                  { label: 'kcal', value: MOCK_TOTALS.kcal, suffix: '' },
                  { label: 'protein', value: MOCK_TOTALS.protein, suffix: 'g' },
                  { label: 'carbs', value: MOCK_TOTALS.carbs, suffix: 'g' },
                  { label: 'fat', value: MOCK_TOTALS.fat, suffix: 'g' },
                ].map((stat) => (
                  <Card
                    key={stat.label}
                    className="grow basis-0 items-center gap-0.5 rounded-sm border border-border bg-surface py-3 ring-0"
                  >
                    <NumberFlow
                      value={stat.value}
                      suffix={stat.suffix}
                      className="font-display text-[18px] font-semibold text-text"
                    />
                    <div className="font-sans text-[11px] text-text-muted">
                      {stat.label}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex items-center gap-2.5 rounded-md bg-[#FFF9F3] px-3.5 py-3">
                <Image
                  src="/mascot/reassure.webp"
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0"
                />
                <div className="font-sans text-[12.5px] text-[#6B5843]">
                  Values are estimates — portions were inferred. Review and edit
                  anything that looks off.
                </div>
              </div>
            </div>
            <DrawerFooter className="pt-4 pb-5">
              <Button onClick={handleConfirm} className={CTA_CLASS}>
                Confirm & save
              </Button>
            </DrawerFooter>
          </>
        )}

        {step === 'not-food' && (
          <>
            <DrawerHeader className="flex-row items-center justify-between">
              <div className="size-5" />
              <DrawerTitle className="font-sans text-[15px] font-semibold text-text">
                Log a meal
              </DrawerTitle>
              <DrawerClose className="flex size-5 items-center justify-center">
                <X size={20} className="text-[#333333]" strokeWidth={2} />
              </DrawerClose>
            </DrawerHeader>
            <div className="flex flex-col items-center gap-3.5 px-6 pt-9 pb-2">
              <div className="flex size-30 shrink-0 items-center justify-center rounded-full bg-error-bg">
                <Image
                  src="/mascot/recover.webp"
                  alt=""
                  width={96}
                  height={96}
                  className="size-24"
                />
              </div>
              <div className="max-w-67.5 text-center font-sans text-[14.5px] text-text">
                Hmm, that doesn&apos;t look like a meal. Try describing what you
                ate — like &quot;two eggs and toast.&quot;
              </div>
            </div>
            <div className="flex flex-col gap-2.5 px-5 pt-3.5">
              <div className="font-sans text-caption font-medium text-text">
                Describe what you ate
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="min-h-22.5 rounded-md border-[1.5px] border-error bg-surface p-3.5 font-sans text-[14.5px] text-text focus:outline-none"
              />
            </div>
            <DrawerFooter className="pt-4.5 pb-5">
              <Button onClick={handleParse} className={CTA_CLASS}>
                Try again
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
