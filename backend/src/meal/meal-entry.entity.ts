import type { MealType } from '@foodnote/shared';
import { Column, Entity, OneToMany } from 'typeorm';
import { MealColumns } from './meal-columns';
import { MealItem } from './meal-item.entity';

/**
 * A logged meal. The entry-level totals are the source of truth; `items` are
 * an optional breakdown the server never reconciles. Item-replacement logic
 * (PATCH replaces the whole list) lives in the meals endpoint, not here.
 *
 * `MealColumns` carries the owner, the name, the four totals and `source`,
 * shared with SavedMeal. What is only a logged meal's is here: the occasion.
 */
@Entity('meal_entries')
export class MealEntry extends MealColumns {
  @Column({ type: 'varchar' })
  mealType: MealType;

  /** The Tracking Day is this instant's UTC calendar day — never its own column. */
  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @OneToMany(() => MealItem, (item) => item.meal)
  items: MealItem[];
}
