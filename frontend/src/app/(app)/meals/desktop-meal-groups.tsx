import { Card } from '@/components/ui/card';
import { EmptyGroupLine, MealLine } from './meal-line';
import { formatGroupSummary, type MealGroup } from './helpers';

// Desktop shows all four meal times side by side, always expanded: a day's
// meals fit easily and there is room for them, so collapsing would hide data
// for nothing. Two columns at lg, four at xl — four across a narrow desktop
// window crushes the meal names.
export function DesktopMealGroups({ groups }: { groups: MealGroup[] }) {
  return (
    <div className="hidden grid-cols-2 gap-3.5 lg:grid xl:grid-cols-4">
      {groups.map((group) => (
        <Card
          key={group.mealType}
          className="gap-0 self-start rounded-lg border border-border py-0 ring-0"
        >
          <div className="flex flex-col gap-0.5 px-4 py-3">
            <h2 className="font-sans text-label font-semibold text-text capitalize">
              {group.mealType}
            </h2>
            <div className="font-sans text-caption text-text-muted [font-variant-numeric:tabular-nums]">
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
