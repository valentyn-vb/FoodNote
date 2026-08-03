'use client';

import type { MealResponse } from '@foodnote/shared';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { EmptyGroupLine, MealLine } from '@/components/meal-line';
import {
  formatGroupSummary,
  groupMealsByType,
} from '@/lib/dashboard-transforms';

// One day's meals collapsed behind their meal-time subtotals, so the list reads
// as a four-row summary of where the day's calories went and you drill into the
// one you care about. The dashboard's "Logged today", at every width.
//
// Not /meals: that page shows the day in full, so it renders MealGroups
// expanded instead. The difference is summary versus whole day, which is a
// difference between the two screens and not between two widths (#127) — so
// neither component owns a breakpoint.
//
// All four groups start closed (Base UI defaults `value` to []). `multiple` so
// opening dinner doesn't collapse breakfast.
export function MealGroupsAccordion({ meals }: { meals: MealResponse[] }) {
  const groups = groupMealsByType(meals);

  return (
    <Card className="gap-0 rounded-lg border border-border py-0 ring-0">
      <Accordion multiple>
        {groups.map((group) => (
          <AccordionItem key={group.mealType} value={group.mealType}>
            <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/15 rounded-s-none rounded-e-none items-center">
              <div className="flex flex-1 items-center justify-between gap-3 mr-2 ">
                <span className="text-sm font-semibold capitalize">
                  {group.mealType}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
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
