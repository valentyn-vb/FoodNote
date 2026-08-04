import { DEFAULT_APPEARANCE } from '@foodnote/shared';
import type { ActivityLevel, Appearance, Sex } from '@foodnote/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../database/numeric.transformer';
import { User } from '../user/user.entity';

/**
 * One profile per user, so the row is keyed by the user's id (shared PK) —
 * no separate profile id (the contract never exposes one). Weight and the
 * derived calorie fields (currentWeightKg, maintenanceCalories, calorieTarget)
 * are NOT stored here; they are computed on read.
 */
@Entity('user_profiles')
export class UserProfile {
  @PrimaryColumn('uuid')
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'varchar' })
  sex: Sex;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  heightCm: number;

  @Column({ type: 'varchar' })
  activityLevel: ActivityLevel;

  /**
   * Which appearance the app renders in. Stored here so it follows the user
   * between devices; the browser keeps a cookie copy for the first paint, which
   * is a cache and not the truth (ADR 0014).
   */
  @Column({ type: 'varchar', default: DEFAULT_APPEARANCE })
  appearance: Appearance;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
