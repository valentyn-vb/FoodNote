'use client';

import { formatMealTime } from '@/lib/dashboard-transforms';
import { deleteMeal } from '@/lib/actions/meals';
import type { MealResponse } from '@foodnote/shared';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MealLogDrawer } from './meal-log-drawer';

// A meal inside a meal-time group. A flat row, not a Card: these sit inside the
// group's own card, where a nested card reads heavy. (It replaced the former
// dashboard MealRow, which was a Card because it sat directly on the page
// background.) No NumberFlow either — these lists don't animate, so the calorie
// figure is plain text.
export function MealLine({ meal }: { meal: MealResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  // The row used to vanish on click and come back if the request failed, against
  // a client list this component could edit. The list is server state now, so it
  // goes when the re-render arrives; `isDeleting` is what says the tap landed.
  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteMeal(
        meal.id,
        "Couldn't delete your meal. Please try again.",
      );
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate text-sm font-semibold">{meal.mealName}</div>
        <div className="text-sm text-muted-foreground">
          {meal.source === 'ai' ? 'AI logged' : 'Manual'} ·{' '}
          {formatMealTime(meal.recordedAt)}
        </div>
      </div>
      {/* Two groups, so the figure and the controls can be spaced apart
          without loosening the controls from each other. */}
      <div className="flex shrink-0 items-center gap-4">
        {/* The figure comes before the controls: it is what the row is read
            for, and it lines up with the group subtotals above it. */}
        <div className="text-sm font-semibold tabular-nums">
          {meal.totalCalories} kcal
        </div>
        {/* `gap-3` is a floor, not a spacing choice: each button carries a
            44px touch target on a 32px box, so anything tighter overlaps the
            two and a tap near the edge goes to whichever won on source order —
            with Delete as the neighbour. */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${meal.mealName}`}
            onClick={() => setEditOpen(true)}
            className="touch-target text-muted-foreground"
          >
            <PencilIcon />
          </Button>
          <MealLogDrawer
            mode="edit"
            meal={meal}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${meal.mealName}`}
            onClick={handleDelete}
            disabled={isDeleting}
            className="touch-target text-muted-foreground"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Shown in place of the meal lines when nothing was logged for a meal time. */
export function EmptyGroupLine() {
  return (
    <div className="px-5 py-3 text-sm text-muted-foreground">
      Nothing logged
    </div>
  );
}
