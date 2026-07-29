'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { EmptyGroupLine, MealLine } from './meal-line';
import { formatGroupSummary, type MealGroup } from './helpers';

// Mobile collapses each meal time behind its subtotal, so the screen opens as a
// four-row summary of where the day's calories went and you drill into the one
// you care about. All four start closed (Base UI defaults `value` to []).
// `multiple` so opening dinner doesn't collapse breakfast.
export function MobileMealGroups({ groups }: { groups: MealGroup[] }) {
  return (
    <Card variant="tile" className="gap-0 lg:hidden">
      <Accordion multiple>
        {groups.map((group) => (
          <AccordionItem key={group.mealType} value={group.mealType}>
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-3">
                <span className="font-sans text-label font-semibold text-text capitalize">
                  {group.mealType}
                </span>
                <span className="font-sans text-caption text-text-muted [font-variant-numeric:tabular-nums]">
                  {formatGroupSummary(group)}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="flex flex-col border-t border-border">
                {group.meals.length === 0 ? (
                  <EmptyGroupLine />
                ) : (
                  group.meals.map((meal) => (
                    <MealLine key={meal.id} meal={meal} />
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
}
