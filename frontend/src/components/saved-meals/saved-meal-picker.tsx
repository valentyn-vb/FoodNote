'use client';

import { useEffect, useState } from 'react';
import type { SavedMealResponse } from '@foodnote/shared';
import { savedMeals as savedMealsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormGroupLabel } from '@/components/form-fields';
import { SavedMealRow } from './saved-meal-row';

/**
 * The user's Saved Meals, under the parse input. Picking one is the point of the
 * whole feature: a meal logged again without spending a parse.
 *
 * Fetches for itself rather than reading a provider. The drawer unmounts its
 * content on close, so this remounts and re-lists on every open — which is also
 * what makes a meal kept a moment ago show up next time without any shared state
 * to keep in step.
 *
 * Its own capped scroller rather than growing with the list: on a phone the
 * drawer is content-sized, and a dozen saved meals would push the description
 * field and the Parse action off the screen.
 */
export function SavedMealPicker({
  onPick,
}: {
  onPick: (saved: SavedMealResponse) => void;
}) {
  const [savedMeals, setSavedMeals] = useState<SavedMealResponse[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  );
  const [reloadKey, setReloadKey] = useState(0);

  // Promise chain with a cancelled flag, as the app's other fetches do: setState
  // only ever runs from the .then/.catch callbacks.
  useEffect(() => {
    let cancelled = false;
    savedMealsApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setSavedMeals(list);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <section className="flex flex-col gap-2">
      <FormGroupLabel>My meals</FormGroupLabel>

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
        <ul className="-mx-1 flex max-h-64 flex-col gap-1 overflow-y-auto overscroll-contain px-1">
          {savedMeals.map((saved) => (
            <li key={saved.id}>
              <SavedMealRow saved={saved} onPick={() => onPick(saved)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
