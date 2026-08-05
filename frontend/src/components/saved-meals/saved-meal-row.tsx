'use client';

import { Trash2Icon } from 'lucide-react';
import type { SavedMealResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';

/**
 * One saved meal in the picker: the row opens it for logging, the trash drops the
 * template.
 *
 * Two targets, so a wrapping `<button>` is out — the row is a div holding the
 * body button and the trash button, the shape `meal-line.tsx` uses. `gap-3` there
 * is a measured floor, not a spacing choice: the trash carries a 44px
 * `touch-target` over a 32px box, so anything tighter overlaps the body's own hit
 * area and a tap near the edge goes to whichever won on source order — with
 * Delete as one of the two.
 */
export function SavedMealRow({
  saved,
  onPick,
  onDelete,
}: {
  saved: SavedMealResponse;
  onPick: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-accent/20 pr-2 transition-colors has-[button:hover]:bg-accent">
      <button
        type="button"
        onClick={onPick}
        // The body carries the row's padding, so the whole text block is the
        // target rather than a strip inside it.
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            {saved.mealName}
          </span>
          {/* Whole grams: a kept meal is a starting point the user rescales, so a
              decimal here would read as precision the figure doesn't claim. */}
          <span className="text-sm tabular-nums text-muted-foreground">
            P {Math.round(saved.proteinGrams)} · C{' '}
            {Math.round(saved.carbsGrams)} · F {Math.round(saved.fatGrams)}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {Math.round(saved.totalCalories)} kcal
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${saved.mealName} from My meals`}
        onClick={onDelete}
        className="touch-target text-muted-foreground"
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
