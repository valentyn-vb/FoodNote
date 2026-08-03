'use client';

import { TrendingDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WeightLogDrawer } from '@/components/weight-log-drawer';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';

/**
 * "Log weight", wherever the width puts it: the header from 768 up, the sidebar
 * sheet below it. One component because the gate below is a rule, not a look —
 * a weight is always stamped "now" on create, so it cannot be logged onto the
 * day the nav is showing, and off today the action is disabled rather than
 * silently writing to today (#119). Stated twice, it would drift.
 *
 * Only ever mounted once: the two call sites are mutually exclusive on the same
 * 768 threshold. Rendering both and hiding one with CSS kept two drawers, two
 * forms and two media-query subscriptions alive on a phone.
 */
export function LogWeightAction({ className }: { className?: string }) {
  const { isToday } = useMeals();
  const { onWeightSaved } = useWeight();

  return (
    <WeightLogDrawer
      mode="create"
      onWeightSaved={onWeightSaved}
      trigger={
        <Button
          variant="outline"
          size="lg"
          disabled={!isToday}
          className={className}
        >
          <TrendingDownIcon />
          Log weight
        </Button>
      }
    />
  );
}
