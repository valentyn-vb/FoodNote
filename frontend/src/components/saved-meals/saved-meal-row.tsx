'use client';

import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { SavedMealResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';

/**
 * One saved meal in the picker. Three things it can do, and they are deliberately
 * three separate controls: the row body logs it, the pencil corrects the template
 * itself, the trash drops it. Keeping the log and the edit apart is the whole
 * point — adjusting a portion on the way to logging must not rewrite what you
 * kept (ADR-0014), so changing the template is its own explicit press.
 *
 * A wrapping `<button>` is therefore out: the row is a div holding three buttons,
 * the shape `meal-line.tsx` uses. `gap-3` between the icons is a measured floor,
 * not a spacing choice — each carries a 44px `touch-target` over a 32px box, so
 * anything tighter overlaps its neighbour and a tap near the edge goes to
 * whichever won on source order, with Delete as one of them.
 */
export function SavedMealRow({
  saved,
  onPick,
  onEdit,
  onDelete,
}: {
  saved: SavedMealResponse;
  onPick: () => void;
  onEdit: () => void;
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

      {/* Its own group, so the pair keeps its measured gap while the figure
          above can be spaced away from both. */}
      <div className="flex shrink-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${saved.mealName}`}
          onClick={onEdit}
          className="touch-target text-muted-foreground"
        >
          <PencilIcon />
        </Button>
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
    </div>
  );
}
