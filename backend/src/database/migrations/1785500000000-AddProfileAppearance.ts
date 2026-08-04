import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the appearance preference to profiles (#145).
 *
 * NOT NULL with a 'system' default, so every existing profile is already valid
 * and already means "follow the device" — which is what the app did before this
 * column existed.
 */
export class AddProfileAppearance1785500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD "appearance" character varying NOT NULL DEFAULT 'system'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN "appearance"`,
    );
  }
}
