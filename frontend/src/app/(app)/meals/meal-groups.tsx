import type { MealResponse } from '@foodnote/shared';
import { Card } from '@/components/ui/card';
import { EmptyGroupLine, MealLine } from '@/components/meal-line';
import {
  formatGroupSummary,
  groupMealsByType,
} from '@/lib/dashboard-transforms';

// The whole day, expanded, at every width — the difference from the dashboard's
// MealGroupsAccordion is summary versus whole day, not phone versus desktop
// (#127). This page exists to show the day in full; collapsing it would hide the
// only thing on the screen.
//
// Two columns is the ceiling. `xl:grid-cols-4` truncated meal names at 1440
// while most of the page stood empty; two give each card ~560px there.
export function MealGroups({ meals }: { meals: MealResponse[] }) {
  const groups = groupMealsByType(meals);

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      {groups.map((group) => (
        <Card
          key={group.mealType}
          className="gap-0 self-start rounded-lg border border-border py-0 ring-0"
        >
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <h2 className="text-sm font-semibold capitalize">
              {group.mealType}
            </h2>
            <div className="text-sm text-muted-foreground tabular-nums">
              {formatGroupSummary(group)}
            </div>
          </div>
          <div className="flex flex-col border-t border-border">
            {group.meals.length === 0 ? (
              <EmptyGroupLine />
            ) : (
              group.meals.map((meal) => <MealLine key={meal.id} meal={meal} />)
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
