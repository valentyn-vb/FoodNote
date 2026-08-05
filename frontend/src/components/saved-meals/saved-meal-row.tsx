'use client';

import { ChevronRight } from 'lucide-react';
import type { SavedMealResponse } from '@foodnote/shared';

/**
 * One saved meal in the picker. The whole row is the control, not a label beside
 * a button: two lines of text put it well past 44px, and one target per row means
 * there is no pair of overlapping hit areas to space apart.
 */
export function SavedMealRow({
  saved,
  onPick,
}: {
  saved: SavedMealResponse;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-3 rounded-md bg-accent/20 px-3 py-2.5 text-left transition-colors hover:bg-accent"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{saved.mealName}</span>
        {/* Whole grams: a kept meal is a starting point the user rescales, so a
            decimal here would read as precision the figure doesn't claim. */}
        <span className="text-sm tabular-nums text-muted-foreground">
          P {Math.round(saved.proteinGrams)} · C {Math.round(saved.carbsGrams)}{' '}
          · F {Math.round(saved.fatGrams)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {Math.round(saved.totalCalories)} kcal
      </span>
      {/* Says the row opens something rather than logging on the spot. */}
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </button>
  );
}
