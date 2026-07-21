import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../database/numeric.transformer';
import { MealEntry } from './meal-entry.entity';

/**
 * An optional per-item breakdown of a MealEntry. Pure child row: no
 * independent lifecycle, so no timestamps. Deleting the parent meal cascades.
 */
@Entity('meal_items')
export class MealItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  mealEntryId: string;

  @ManyToOne(() => MealEntry, (meal) => meal.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mealEntryId' })
  meal: MealEntry;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  quantityDescription: string;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    transformer: numericTransformer,
  })
  calories: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  proteinGrams: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  carbsGrams: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  fatGrams: number;
}
