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
// All four meal times across the page at `xl`, where there is width for them.
// Not at `lg`: the sidebar and the page padding leave 720px there, so four
// columns would be ~165px each. The name wraps rather than truncating
// (meal-line.tsx), which is what makes the narrow column readable.
export function MealGroups({ meals }: { meals: MealResponse[] }) {
  const groups = groupMealsByType(meals);

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
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
