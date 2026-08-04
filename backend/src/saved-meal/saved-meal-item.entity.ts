import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { MealItemColumns } from '../meal/meal-columns';
import { SavedMeal } from './saved-meal.entity';

/**
 * A line inside a SavedMeal. Identical to MealItem but for its parent — the
 * shared base is what guarantees that, so a line means the same thing whichever
 * table it sits in and copying one across needs no conversion.
 *
 * Nutrition Density plus Portion Weight is the whole reason a Saved Meal is
 * worth keeping: the density outlives the meal, so the same food can be logged
 * at a different weight later (ADR-0011). Both stay null for a line kept from a
 * hand-typed meal, which never had a parse behind it.
 */
@Entity('saved_meal_items')
export class SavedMealItem extends MealItemColumns {
  @Column('uuid')
  savedMealId: string;

  @ManyToOne(() => SavedMeal, (saved) => saved.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'savedMealId' })
  savedMeal: SavedMeal;
}
