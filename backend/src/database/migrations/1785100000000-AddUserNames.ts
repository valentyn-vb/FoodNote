import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds firstName/lastName to users, captured at registration (#62).
 * NOT NULL with a '' default so existing rows remain valid; every new
 * sign-up supplies validated (min-1) values via registerRequestSchema.
 */
export class AddUserNames1785100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "firstName" character varying NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastName" character varying NOT NULL DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
  }
}
