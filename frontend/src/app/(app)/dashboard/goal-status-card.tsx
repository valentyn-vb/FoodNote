'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardResponse } from '@foodnote/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { goals } from '@/lib/api-client';
import { useMeals } from '@/lib/meals-context';
import { formatGoalDate, weeksUntil } from '@/lib/dashboard-transforms';
import { STAT_TILE_CLASS } from './helpers';

type GoalBlock = DashboardResponse['goal'];

type GoalStatus = 'in-progress' | 'maintaining' | 'reached';

/**
 * `projectedGoalDate` is null for BOTH a reached goal and a maintenance plan
 * (pace 0) — `reachedTarget` is what separates them. A live plan always has a
 * date, so "null and not reached" can only mean maintaining.
 */
function goalStatusOf(goal: GoalBlock): GoalStatus {
  if (goal.reachedTarget) return 'reached';
  return goal.projectedGoalDate === null ? 'maintaining' : 'in-progress';
}

// The two exits from a reached goal.
function GoalReachedActions() {
  const { goal, refetchDashboard } = useMeals();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchToMaintenance() {
    setSwitching(true);
    try {
      // A pace switch, not a new plan: pace 0 IS maintenance, and PATCH is what
      // owns pace (ADR-0003). The old target stays parked, so patching a real
      // pace back later resumes the same plan instead of minting a new goal.
      await goals.update({ preferredWeeklyChangeKg: 0 });
      await refetchDashboard();
      toast.success('Switched to maintenance', {
        description: goal
          ? `Your daily calories now hold you at ${goal.currentWeightKg} kg.`
          : undefined,
      });
    } catch {
      toast.error("Couldn't switch to maintenance. Please try again.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        variant="link"
        disabled={switching}
        onClick={switchToMaintenance}
        className="h-auto gap-1 p-0 font-sans text-caption font-medium text-primary-deep"
      >
        {switching && <Loader2 className="size-3.5 animate-spin" />}
        Switch to maintenance
      </Button>
      <Button
        type="button"
        variant="link"
        onClick={() => router.push('/profile')}
        className="h-auto p-0 font-sans text-caption text-text-muted"
      >
        Set a new target
      </Button>
    </div>
  );
}

/**
 * Goal progress as a stat tile — the fourth tile in the desktop row, and the
 * same card stacked into the mobile column. One component so the three states
 * and their copy can't drift between the two layouts.
 *
 * `STAT_TILE_CLASS` carries `grow basis-0` for the desktop tile row; that is
 * inert in the mobile column, which has no height to distribute.
 */
export function GoalStatusCard({ goal }: { goal: GoalBlock }) {
  const status = goalStatusOf(goal);

  return (
    <Card className={STAT_TILE_CLASS}>
      <h2 className="font-sans text-[12px] text-text-muted">
        {status === 'in-progress' ? 'Projected goal date' : 'Goal'}
      </h2>
      <div className="font-display text-heading-lg font-semibold text-text">
        {/* `!projectedGoalDate` is the maintaining case — the same condition as
            goalStatusOf, written inline so the date narrows to non-null. */}
        {status === 'reached'
          ? 'You hit your target'
          : !goal.projectedGoalDate
            ? 'Maintaining your weight'
            : `${formatGoalDate(goal.projectedGoalDate)} · ${weeksUntil(
                goal.projectedGoalDate,
                new Date(),
              )} wks`}
      </div>
      {status === 'reached' && <GoalReachedActions />}
    </Card>
  );
}
