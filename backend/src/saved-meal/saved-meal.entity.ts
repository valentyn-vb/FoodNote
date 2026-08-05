import { Entity, OneToMany } from 'typeorm';
import { MealColumns } from '../meal/meal-columns';
import { SavedMealItem } from './saved-meal-item.entity';

/**
 * A meal the user keeps to log again — `MealColumns` minus the occasion. A
 * MealEntry adds `mealType` and `recordedAt`; a Saved Meal has neither, because
 * both describe a moment rather than the food, and both are chosen when it is
 * logged (the same way a Parsed Meal carries no meal type).
 *
 * Nothing links this to the meal_entries logged from it, in either direction:
 * logging copies (ADR-0014). That is what lets a template be corrected or
 * deleted without touching a day the user has already counted.
 */
@Entity('saved_meals')
export class SavedMeal extends MealColumns {
  @OneToMany(() => SavedMealItem, (item) => item.savedMeal)
  items: SavedMealItem[];
}
