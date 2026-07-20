import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * `day` is the UTC calendar day derived from recordedAt, stored redundantly
 * so the (userId, day) unique index can enforce one entry per day without a
 * generated/expression column. No migration backs this yet — relies on
 * TypeORM `synchronize` (see app.module.ts); a real migration is still owed
 * before this can run against production Postgres.
 */
@Entity('weight_entries')
@Index(['userId', 'day'], { unique: true })
export class WeightEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'double precision' })
  weightKg: number;

  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @Column({ type: 'date' })
  day: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
