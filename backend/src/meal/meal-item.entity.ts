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
 * An optional per-item breakdown of a MealEntry. Stores Nutrition Density
 * (per 100 g) and Portion Weight so the density survives a meal and is
 * reusable at a different weight (ADR-0011). Pure child row: no independent
 * lifecycle, so no timestamps. Deleting the parent meal cascades.
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
    nullable: true,
    transformer: numericTransformer,
  })
  portionGrams: number | null;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  caloriesPer100g: number | null;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  proteinGramsPer100g: number | null;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  carbsGramsPer100g: number | null;

  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  fatGramsPer100g: number | null;
}
