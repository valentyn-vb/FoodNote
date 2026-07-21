import type { GoalStatus } from '@foodnote/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../database/numeric.transformer';
import { User } from '../user/user.entity';

/**
 * At most one goal per user is `active`; creating a new goal replaces the
 * previous one (status -> `replaced`). startWeightKg/startDate are set by the
 * server at creation and immutable; projectedGoalDate is derived on read.
 */
@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  startWeightKg: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  targetWeightKg: number;

  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: numericTransformer,
  })
  preferredWeeklyChangeKg: number;

  // Postgres `date`; TypeORM returns it as an ISO 'YYYY-MM-DD' string, which
  // matches the contract's dateSchema.
  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'varchar', default: 'active' })
  status: GoalStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
