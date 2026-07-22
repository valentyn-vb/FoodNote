import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Enforces "at most one active goal per user" at the database level — the
 * backstop for the replace-then-insert logic in POST /goals (#29, ADR-0003).
 */
export class AddActiveGoalUniqueIndex1785000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_goals_one_active_per_user" ON "goals" ("userId") WHERE "status" = 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_goals_one_active_per_user"`,
    );
  }
}
