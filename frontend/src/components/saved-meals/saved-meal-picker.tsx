'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { SavedMealResponse } from '@foodnote/shared';
import {
  createSavedMeal,
  deleteSavedMeal,
  listSavedMeals,
} from '@/lib/actions/saved-meals';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormGroupLabel } from '@/components/form-fields';
import { SavedMealRow } from './saved-meal-row';

/** The server's order, so a row put back lands where a refetch would show it. */
const byName = (a: SavedMealResponse, b: SavedMealResponse) =>
  a.mealName.localeCompare(b.mealName);

/**
 * The user's Saved Meals, under the parse input. Picking one is the point of the
 * whole feature: a meal logged again without spending a parse.
 *
 * Reads for itself, through `listSavedMeals`, rather than taking the list as a
 * prop from the route: the drawer is mounted by the shell on every route and the
 * list is worth nothing until it opens, so a server read would pay for it on
 * every navigation. The drawer unmounts its content on close, so this remounts
 * and re-lists on every open — which is also what makes a meal kept a moment ago
 * show up next time without any shared state to keep in step.
 *
 * Takes whatever height the body has left and scrolls inside it, rather than
 * growing with the list: on a phone the drawer is content-sized, and a dozen
 * saved meals would push the description field and the Parse action off the
 * screen. The floor is what a clamped sheet shrinks it to instead of to nothing.
 */
export function SavedMealPicker({
  onPick,
  onEdit,
}: {
  /** Open it for logging — a copy, leaving the template alone. */
  onPick: (saved: SavedMealResponse) => void;
  /** Open the template itself for correction. */
  onEdit: (saved: SavedMealResponse) => void;
}) {
  const [savedMeals, setSavedMeals] = useState<SavedMealResponse[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  );
  const [reloadKey, setReloadKey] = useState(0);

  // A cancelled flag rather than an AbortController: an action's promise cannot
  // be aborted, so the guard is on the setState, not on the request.
  useEffect(() => {
    let cancelled = false;
    listSavedMeals().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus('error');
        return;
      }
      setSavedMeals(result.data);
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /**
   * Drops a template, optimistically. The row goes first so the list answers the
   * tap, and comes back if the request fails.
   *
   * Undo re-creates rather than restoring: there is no endpoint to un-delete, and
   * a Saved Meal is fully described by what we already hold, so posting the row
   * straight back is lossless. It gets a new id, which nothing refers to — no
   * meal links to a template (ADR-0014) — and the request schema drops the old
   * one. Meals already logged from it were never affected either way.
   */
  function remove(saved: SavedMealResponse) {
    setSavedMeals((prev) => prev.filter((m) => m.id !== saved.id));
    void deleteSavedMeal(
      saved.id,
      "Couldn't remove that meal. Please try again.",
    ).then((result) => {
      if (!result.ok) {
        setSavedMeals((prev) => [...prev, saved].sort(byName));
        toast.error(result.message);
        return;
      }
      toast.success(`“${saved.mealName}” removed from My meals`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void createSavedMeal(saved).then((again) => {
              if (!again.ok) {
                toast.error("Couldn't undo — the meal is still removed.");
                return;
              }
              setSavedMeals((prev) => [...prev, again.data].sort(byName));
            });
          },
        },
      });
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      <FormGroupLabel>My meals</FormGroupLabel>
      {/* What a press does, said once for the whole list rather than drawn on
          every row. Only with rows to say it about — the empty state below
          already explains what the list is for. */}
      {status === 'ready' && savedMeals.length > 0 && (
        <p className="text-xs text-muted-foreground -mt-1">
          Select a meal to log it again — the pencil edits the saved meal, not
          your log.
        </p>
      )}

      {status === 'loading' && (
        <div className="flex flex-col gap-2">
          {/* Two rows at a real row's height: the list is short, and a spinner
              here would compete with the parse action for attention. */}
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      )}

      {/* Muted and non-blocking: the parse path above still works, so a failed
          list is a missing shortcut rather than a broken drawer. */}
      {status === 'error' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          Couldn&apos;t load your saved meals.
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              setStatus('loading');
              setReloadKey((k) => k + 1);
            }}
          >
            Try again
          </Button>
        </p>
      )}

      {status === 'ready' && savedMeals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Meals you save show up here, to log again without another parse.
        </p>
      )}

      {status === 'ready' && savedMeals.length > 0 && (
        <ul className="flex min-h-24 flex-col gap-1 overflow-y-auto p-1 overscroll-contain bg-background rounded-lg">
          {savedMeals.map((saved) => (
            // No divider between rows: each one lights up as a whole on
            // approach, and a line through the list fought that fill for the
            // job of saying where one row ends.
            <li key={saved.id}>
              <SavedMealRow
                saved={saved}
                onPick={() => onPick(saved)}
                onEdit={() => onEdit(saved)}
                onDelete={() => remove(saved)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
