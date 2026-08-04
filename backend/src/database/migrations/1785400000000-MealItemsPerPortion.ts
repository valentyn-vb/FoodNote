import { MigrationInterface, QueryRunner } from 'typeorm';

export class MealItemsPerPortion1785400000000 implements MigrationInterface {
  name = 'MealItemsPerPortion1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the new nullable columns before dropping the old ones so that the
    // backfill can read the old values while both sets exist.
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "portionGrams" numeric(7,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "caloriesPer100g" numeric(7,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "proteinGramsPer100g" numeric(7,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "carbsGramsPer100g" numeric(7,2) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "fatGramsPer100g" numeric(7,2) NULL`,
    );

    // Backfill: treat the old absolute values as per-100 g nutrition with a
    // 100 g portion. Preserves every logged figure exactly — items illustrate
    // the meal (ADR-0008), not a precise food record, so this is adequate.
    await queryRunner.query(`
      UPDATE "meal_items"
      SET "portionGrams"        = 100,
          "caloriesPer100g"     = "calories",
          "proteinGramsPer100g" = "proteinGrams",
          "carbsGramsPer100g"   = "carbsGrams",
          "fatGramsPer100g"     = "fatGrams"
    `);

    await queryRunner.query(`ALTER TABLE "meal_items" DROP COLUMN "calories"`);
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "proteinGrams"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "carbsGrams"`,
    );
    await queryRunner.query(`ALTER TABLE "meal_items" DROP COLUMN "fatGrams"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add absolute columns and derive values from density × weight / 100.
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "calories" numeric(7,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "proteinGrams" numeric(6,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "carbsGrams" numeric(6,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD "fatGrams" numeric(6,2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(`
      UPDATE "meal_items"
      SET "calories"      = COALESCE("caloriesPer100g"     * "portionGrams" / 100, 0),
          "proteinGrams"  = COALESCE("proteinGramsPer100g" * "portionGrams" / 100, 0),
          "carbsGrams"    = COALESCE("carbsGramsPer100g"   * "portionGrams" / 100, 0),
          "fatGrams"      = COALESCE("fatGramsPer100g"     * "portionGrams" / 100, 0)
    `);

    await queryRunner.query(
      `ALTER TABLE "meal_items" ALTER COLUMN "calories" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ALTER COLUMN "proteinGrams" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ALTER COLUMN "carbsGrams" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ALTER COLUMN "fatGrams" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "portionGrams"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "caloriesPer100g"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "proteinGramsPer100g"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "carbsGramsPer100g"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP COLUMN "fatGramsPer100g"`,
    );
  }
}
