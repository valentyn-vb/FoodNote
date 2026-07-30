'use client';

import NumberFlow from '@number-flow/react';
import type { MealResponse } from '@foodnote/shared';
import { ListRow } from '@/components/ui/list-row';
import { Text } from '@/components/ui/text';
import { formatMealTime } from '@/lib/dashboard-transforms';

// Shared by the mobile "Logged today" list and the desktop meals column.
export function MealRow({ meal }: { meal: MealResponse }) {
  return (
    <ListRow
      title={meal.mealName}
      meta={`${meal.source === 'ai' ? 'AI logged' : 'Manual'} · ${formatMealTime(meal.recordedAt)}`}
      end={
        <Text variant="label" numeric>
          <NumberFlow value={meal.totalCalories} suffix=" kcal" />
        </Text>
      }
    />
  );
}
