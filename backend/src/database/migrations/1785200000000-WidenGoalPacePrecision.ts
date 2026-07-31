import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Widens the Goal's Pace from numeric(4,2) to numeric(6,4) (#82, ADR-0009).
 *
 * A manual plan derives its Pace from a calorie budget the user typed, and one
 * step of Pace is worth `step × 7700 ÷ 7` kcal/day. At two decimals that step is
 * 11 kcal, so a typed 1,600 came back as 1,596. Four decimals put the step at
 * 0.11 kcal, inside the ±0.5 that whole-kcal rounding absorbs, so the budget
 * round-trips exactly.
 *
 * Widening only — every stored preset (0, 0.25, 0.5, 0.75, 1.00) is representable
 * unchanged, so existing rows need no backfill. The integer part stays two digits
 * so nothing that fit before stops fitting.
 */
export class WidenGoalPacePrecision1785200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "preferredWeeklyChangeKg" TYPE numeric(6,4)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Narrowing rounds any derived rate back onto the 2dp grid — lossy by
    // nature, which is the point of the forward migration.
    await queryRunner.query(
      `ALTER TABLE "goals" ALTER COLUMN "preferredWeeklyChangeKg" TYPE numeric(4,2)`,
    );
  }
}
