import type { MealSource } from '@foodnote/shared';
import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../database/numeric.transformer';
import { User } from '../user/user.entity';

/**
 * The columns a logged meal and a kept one have in common, as abstract bases
 * rather than two hand-kept copies.
 *
 * Deliberately not `@Entity`: TypeORM walks the inheritance tree and copies
 * these columns and relations into each concrete table (there is no shared
 * parent table, and no discriminator). So `meal_entries` and `saved_meals` —
 * and `meal_items` and `saved_meal_items` — are identical by construction
 * rather than by review, which is the point: a precision changed in one place
 * cannot silently diverge from the other, and the round-trip guarantee in
 * ADR-0011 holds for both.
 *
 * Nothing here is an aggregate boundary. SavedMeal borrows these columns; it is
 * not a kind of MealEntry, and nothing links the two (ADR-0014).
 */

/**
 * An owned meal with a name and the four macro totals that are its source of
 * truth. MealEntry adds the occasion it was eaten on (`mealType`,
 * `recordedAt`); SavedMeal has no occasion at all.
 */
export abstract class MealColumns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  mealName: string;

  // Calories get a wider column than the macros: 10 000 kcal fits in 7,2, and
  // 1 000 g of a macro fits in 6,2 (see caloriesSchema / macroGramsSchema).
  @Column({
    type: 'numeric',
    precision: 7,
    scale: 2,
    transformer: numericTransformer,
  })
  totalCalories: number;

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

  /** How the figures were produced — `manual` or `ai`, never how the row was. */
  @Column({ type: 'varchar' })
  source: MealSource;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * One line of a meal's breakdown: what the food was, the quantity as stated,
 * and Nutrition Density plus Portion Weight (ADR-0011).
 *
 * The five figures are nullable together — a hand-added line has no parse
 * behind it, so no weight and no density. The parent link differs per table and
 * stays on the concrete class.
 */
export abstract class MealItemColumns {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
