import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { MealItemColumns } from './meal-columns';
import { MealEntry } from './meal-entry.entity';

/**
 * An optional per-item breakdown of a MealEntry. The name, quantity, Portion
 * Weight and Nutrition Density come from `MealItemColumns`, shared with
 * SavedMealItem; only the parent link is this table's own.
 *
 * Pure child row: no independent lifecycle, so no timestamps — that is why the
 * item base is its own and not MealColumns. Deleting the parent meal cascades.
 */
@Entity('meal_items')
export class MealItem extends MealItemColumns {
  @Column('uuid')
  mealEntryId: string;

  @ManyToOne(() => MealEntry, (meal) => meal.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mealEntryId' })
  meal: MealEntry;
}
