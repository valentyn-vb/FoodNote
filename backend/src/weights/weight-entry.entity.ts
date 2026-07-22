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
 * The weight journal — the only place body weight is written. A plain list:
 * a user may log any number of entries. currentWeightKg (on /profile and
 * /dashboard) is derived from the entry with the latest recordedAt.
 * One-entry-per-UTC-day upsert is deferred to #31 (needs its own migration).
 */
@Entity('weight_entries')
export class WeightEntry {
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
  weightKg: number;

  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
