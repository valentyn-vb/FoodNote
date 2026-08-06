'use client';

import { formatMealTime } from '@/lib/dashboard-transforms';
import { deleteMeal, updateMeal } from '@/lib/actions/meals';
import { createSavedMeal } from '@/lib/actions/saved-meals';
import {
  mealTypeSchema,
  savedMealFrom,
  type MealResponse,
  type MealType,
} from '@foodnote/shared';
import {
  CornerUpRightIcon,
  BookmarkIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MealLogDrawer } from './meal-log-drawer';

// A meal inside a meal-time group. A flat row, not a Card: these sit inside the
// group's own card, where a nested card reads heavy. (It replaced the former
// dashboard MealRow, which was a Card because it sat directly on the page
// background.) No NumberFlow either — these lists don't animate, so the calorie
// figure is plain text.
//
// Everything the row can do is behind one menu rather than a row of icons: the
// four actions do not fit as four controls at 360, and three of them were only
// reachable from inside the edit drawer before.
export function MealLine({ meal }: { meal: MealResponse }) {
  const [editOpen, setEditOpen] = useState(false);
  // One transition for all three actions, so the trigger can go dead while any
  // of them is in flight. Each ends in a server `refresh()`, and a second action
  // fired over the first would act on a row that no longer exists.
  const [isPending, startAction] = useTransition();

  // The row used to vanish on click and come back if the request failed, against
  // a client list this component could edit. The list is server state now, so it
  // goes when the re-render arrives; `isPending` is what says the tap landed.
  function handleDelete() {
    startAction(async () => {
      const result = await deleteMeal(
        meal.id,
        "Couldn't delete your meal. Please try again.",
      );
      if (!result.ok) toast.error(result.message);
    });
  }

  // Only `mealType`: the time is a fact about when the food was eaten, not a
  // consequence of which meal it is filed under, so a lunch moved to dinner
  // keeps 13:20 and sits at the top of dinner's list.
  function handleMove(mealType: MealType) {
    startAction(async () => {
      const result = await updateMeal(meal.id, { mealType });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`“${meal.mealName}” moved to ${mealType}`);
    });
  }

  // No latch, unlike the drawer's button: the menu closes on press, so there is
  // nothing left on screen to hold a "kept" state. Nothing stops duplicate names
  // server-side either, so two presses make two templates.
  function handleSaveToMyMeals() {
    startAction(async () => {
      // `savedMealFrom` drops the occasion — a Saved Meal has no mealType and no
      // recordedAt (ADR-0014) — and drops it through the schema, so the two are
      // omitted in one place rather than re-listed here.
      const result = await createSavedMeal(savedMealFrom(meal));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`“${meal.mealName}” is in My meals`);
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 first:border-t-0">
      {/* `flex-1`, not just `min-w-0`: without it the block sizes to its content
          and then shrinks, and in the two-column grid at `md` it collapsed to
          68px — the name truncated, but "Manual · 10:00 AM" wrapped to two
          lines and the row grew to 86px against the 66px of an empty one. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
        <DropdownMenu>
          <DropdownMenuTrigger
            // Named with the meal: a day's worth of these rows would otherwise
            // put a dozen identical "More actions" in the accessibility tree.
            aria-label={`More actions for ${meal.mealName}`}
            disabled={isPending}
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="touch-target text-muted-foreground"
              />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            {/* A submenu, as the sidebar's Theme is — but plain items inside it
                rather than a radio group: this is an action with a destination,
                not a setting with a current value, and the meal's own meal time
                is not a place it can be moved to. */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <CornerUpRightIcon />
                Move
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {mealTypeSchema.options
                  .filter((mealType) => mealType !== meal.mealType)
                  .map((mealType) => (
                    <DropdownMenuItem
                      key={mealType}
                      onClick={() => handleMove(mealType)}
                      className="capitalize"
                    >
                      {mealType}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={handleSaveToMyMeals}>
              <BookmarkIcon />
              Save to My meals
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Immediate, as the trash control it replaces was. The separator is
                the whole guard against a mis-tap from Save above it. */}
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <MealLogDrawer
          mode="edit"
          meal={meal}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </div>
    </div>
  );
}

/**
 * Shown in place of the meal lines when nothing was logged for a meal time.
 *
 * The same height as a filled row, so a card with one empty group among three
 * filled ones doesn't step: a row is `py-3` around two `text-sm` lines with
 * `gap-0.5` between them. Computed from the spacing scale rather than rounded to
 * `min-h-16`, which is 2px short of it.
 */
export function EmptyGroupLine() {
  return (
    <div className="flex min-h-[calc(--spacing(6)+--spacing(0.5)+2*var(--text-sm--line-height)*var(--text-sm))] items-center px-5 py-3 text-sm text-muted-foreground">
      Nothing logged
    </div>
  );
}
