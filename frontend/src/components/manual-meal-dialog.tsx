'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MANUAL_MEAL_FORM_ID,
  ManualMealForm,
  mealFormSchema,
  type MealFormValues,
} from '@/components/manual-meal-form';
import { useMeals } from '@/lib/meals-context';

export function ManualMealDialog({ onSaved }: { onSaved?: () => void }) {
  const { saveMeal } = useMeals();
  const [open, setOpen] = useState(false);
  const form = useForm<MealFormValues>({
    resolver: zodResolver(mealFormSchema),
  });

  function handleOpenChange(next: boolean) {
    if (next)
      form.reset({
        mealName: '',
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
      });
    setOpen(next);
  }

  function handleSave(values: MealFormValues) {
    setOpen(false);
    saveMeal({
      ...values,
      recordedAt: new Date().toISOString(),
      source: 'manual',
    });
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="link"
            className="h-auto p-0 text-caption text-text-muted"
          />
        }
      >
        Enter manually instead
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sans text-title font-semibold text-text">
            Enter a meal
          </DialogTitle>
          <DialogDescription className="font-sans text-caption text-text-muted">
            Name and calories are required — add the macros if you have them.
          </DialogDescription>
        </DialogHeader>

        <ManualMealForm form={form} onSubmit={handleSave} />

        <DialogFooter className="flex-row justify-end gap-2.5">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" form={MANUAL_MEAL_FORM_ID} variant="cta">
            Save meal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
