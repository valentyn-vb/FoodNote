import type { MealSource, MealType } from '@foodnote/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../database/numeric.transformer';
import { User } from '../user/user.entity';
import { MealItem } from './meal-item.entity';

/**
 * A logged meal. The entry-level totals are the source of truth; `items` are
 * an optional breakdown the server never reconciles. Item-replacement logic
 * (PATCH replaces the whole list) lives in the meals endpoint, not here.
 */
@Entity('meal_entries')
export class MealEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  mealName: string;

  @Column({ type: 'varchar' })
  mealType: MealType;

  @Column({ type: 'timestamptz' })
  recordedAt: Date;

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

  @Column({ type: 'varchar' })
  source: MealSource;

  @OneToMany(() => MealItem, (item) => item.meal)
  items: MealItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
