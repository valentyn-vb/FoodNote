'use client';

import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { MealSource } from '@foodnote/shared';
import type { UseFormReturn } from 'react-hook-form';
import { createSavedMeal } from '@/lib/actions/saved-meals';
import { Button } from '@/components/ui/button';
import { toWireItems, type MealDraftValues } from '@/components/meal-fields';

/**
 * Keeps the draft on screen as a Saved Meal, to log again later without a parse.
 *
 * Its own press rather than a checkbox on the save: the two are independent
 * records (ADR-0014), either order is valid, and this is the only way to keep a
 * meal that was logged days ago — which is why the Edit step carries it too.
 *
 * It latches once it succeeds. Nothing stops duplicate names server-side, so
 * without that a second press would quietly make a second copy.
 */
export function SaveToMyMealsButton({
  form,
  source,
}: {
  form: UseFormReturn<MealDraftValues>;
  source: MealSource;
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'kept'>('idle');

  async function keep() {
    // A template is the draft as shown, so it has to clear the same validation a
    // Meal Entry does — an unnamed meal is no more keepable than it is loggable.
    if (!(await form.trigger())) return;
    setState('saving');
    const values = form.getValues();
    // No mealType and no recordedAt: those describe an occasion, and a Saved
    // Meal has none — the user picks them each time it is logged.
    const result = await createSavedMeal({
      mealName: values.mealName,
      totalCalories: values.totalCalories,
      proteinGrams: values.proteinGrams,
      carbsGrams: values.carbsGrams,
      fatGrams: values.fatGrams,
      source,
      items: toWireItems(values.items),
    });
    if (!result.ok) {
      // Back to idle, not a dead end: the meal is still there to keep.
      setState('idle');
      toast.error(result.message);
      return;
    }
    setState('kept');
    toast.success(`“${values.mealName}” is in My meals`);
  }

  const kept = state === 'kept';

  return (
    // Quiet, and the same shape as the drawer's other secondary links: `py-2`
    // puts it at ~36px where `p-0` would leave a 20px strip to hit.
    <Button
      type="button"
      variant="link"
      className="h-auto gap-1 px-1 py-2 text-sm text-muted-foreground"
      onClick={keep}
      disabled={state !== 'idle'}
    >
      {kept ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {kept ? 'In My meals' : 'Save to My meals'}
    </Button>
  );
}
