import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Saved Meal tables — a meal kept by name to log again (ADR-0014).
 *
 * A mirror of meal_entries / meal_items minus the occasion (`mealType`,
 * `recordedAt`), and with no reference in either direction to the meals logged
 * from it: logging copies. Both tables' shared columns come from the abstract
 * bases in `meal/meal-columns.ts`, so the precisions here cannot drift from the
 * logged-meal pair.
 *
 * The constraint names are TypeORM's own generated hashes, kept verbatim from
 * `migration:generate` so a later generate sees no drift.
 */
export class SavedMeals1785500000000 implements MigrationInterface {
  name = 'SavedMeals1785500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Items first, so the FK below has both tables to reference. Nullable
    // together, like meal_items: a line kept from a hand-typed meal has no
    // parse behind it, so neither a weight nor a density (ADR-0011).
    await queryRunner.query(
      `CREATE TABLE "saved_meal_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "quantityDescription" character varying NOT NULL, "portionGrams" numeric(7,2), "caloriesPer100g" numeric(7,2), "proteinGramsPer100g" numeric(7,2), "carbsGramsPer100g" numeric(7,2), "fatGramsPer100g" numeric(7,2), "savedMealId" uuid NOT NULL, CONSTRAINT "PK_cefd8dcd65df1b16c0a8d2fe329" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "saved_meals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "mealName" character varying NOT NULL, "totalCalories" numeric(7,2) NOT NULL, "proteinGrams" numeric(6,2) NOT NULL, "carbsGrams" numeric(6,2) NOT NULL, "fatGrams" numeric(6,2) NOT NULL, "source" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_252c66b661b2f406e3d7dda9e5c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_meal_items" ADD CONSTRAINT "FK_d64a1c684b7cd4790002f92d726" FOREIGN KEY ("savedMealId") REFERENCES "saved_meals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_meals" ADD CONSTRAINT "FK_ded193e8214aa23b0499011b9f4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_meals" DROP CONSTRAINT "FK_ded193e8214aa23b0499011b9f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_meal_items" DROP CONSTRAINT "FK_d64a1c684b7cd4790002f92d726"`,
    );
    await queryRunner.query(`DROP TABLE "saved_meals"`);
    await queryRunner.query(`DROP TABLE "saved_meal_items"`);
  }
}
