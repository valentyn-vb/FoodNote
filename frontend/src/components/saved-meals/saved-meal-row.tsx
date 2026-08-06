'use client';

import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { SavedMealResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import { MacroLine } from '@/components/macro-line';

/**
 * One saved meal in the picker. Three things it can do, and they are deliberately
 * three separate controls: the row body logs it, the pencil corrects the template
 * itself, the trash drops it. Keeping the log and the edit apart is the whole
 * point — adjusting a portion on the way to logging must not rewrite what you
 * kept (ADR-0014), so changing the template is its own explicit press.
 *
 * The row body is the log target. What a press does is said once, in a line
 * under the list's own heading, rather than as a control on every row: a fill on
 * approach says "this is a control" but not "this logs a meal", and a per-row
 * label repeated down a list is noise where one sentence does the same work.
 *
 * The icon buttons hover to a `primary` tint rather than `ghost`'s own `accent`,
 * which is the fill the row is already wearing by the time you reach one of them
 * — two identical washes stacked read as no button at all. A tint of the brand
 * colour rather than a grey step: `accent` is already a warm wash, and a neutral
 * square inside it reads as a different material. `--primary` is one value in
 * both appearances on purpose, and the alpha keeps the icon legible over it.
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
    // `has-[button:hover]:` on the container, so hovering the pencil or the
    // trash lights the row too: all three act on the same meal, and a row that
    // stays cold under the control you are about to press reads as two objects.
    //
    // `surface-hover`, a token of its own, because no existing wash did this job:
    // the light set's `muted` and `accent` both carry the cream's tint, and over a
    // list standing on `background` a tinted step read as another material laid on
    // top rather than the same surface, darker. The token is grey in light and
    // `muted`'s value in dark, where a step off the page has to be lighter — a
    // difference per appearance, which is what a token is for (ADR 0014).
    <div className="flex items-center gap-3 rounded-md pr-2 transition-colors has-[button:hover]:bg-muted-foreground/5 has-[button:focus-visible]:bg-muted-foreground/5">
      <button
        type="button"
        onClick={onPick}
        // The body carries the row's padding, so the whole text block is the
        // target rather than a strip inside it.
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-left"
        aria-label={`Log ${saved.mealName}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            {saved.mealName}
          </span>
          <MacroLine macros={saved} />
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {Math.round(saved.totalCalories)} kcal
        </span>
      </button>

      {/* Its own group, so the pair keeps its measured gap while the row body
          can be spaced away from both. */}
      <div className="flex shrink-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${saved.mealName}`}
          onClick={onEdit}
          className="touch-target text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
        >
          <PencilIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${saved.mealName} from My meals`}
          onClick={onDelete}
          className="touch-target text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}
