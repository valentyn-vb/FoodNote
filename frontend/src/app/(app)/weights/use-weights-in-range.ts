'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WeightEntryResponse } from '@foodnote/shared';
import { weights as weightsApi } from '@/lib/api-client';
import type { WeightRange } from '@/lib/weight-range';

type Status = 'loading' | 'error' | 'ready';

/**
 * The journal over an arbitrary range, fetched by this page alone.
 *
 * Deliberately not WeightProvider: that window is a fixed 60 days shared with
 * the dashboard's trend card and its change stat (WEIGHT_WINDOW_DAYS), and
 * widening it to a year to serve this page would make every dashboard figure
 * re-derive over a range the dashboard never asked for. So the provider keeps
 * its window and this page holds its own — the cost is one extra request per
 * range change, against a shared mutable window nobody owns.
 *
 * Refetches on the range, and on `reload` for after an edit or a delete. An
 * edit can move an entry's recordedAt out of the visible range entirely, so
 * this re-lists rather than patching in place, the same reason WeightProvider
 * does (a local patch there once left the client showing an entry the server
 * had already excluded).
 */
export function useWeightsInRange(range: WeightRange) {
  const [entries, setEntries] = useState<WeightEntryResponse[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const { from, to } = range;

  useEffect(() => {
    let cancelled = false;
    // No setStatus('loading') here: setting state synchronously in an effect
    // body cascades renders (the react-hooks rule catches it), and the initial
    // 'loading' already covers the first fetch. A range change therefore keeps
    // the previous entries on screen until the new ones land, which is also
    // what WeightProvider chose on purpose — a skeleton that flashes on every
    // step through the journal is worse than a chart that updates a moment late.
    weightsApi
      .list(from, to)
      .then((list) => {
        if (cancelled) return;
        setEntries(list);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { entries, status, reload };
}
