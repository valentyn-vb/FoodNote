import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1784628906261 implements MigrationInterface {
  name = 'InitialSchema1784628906261';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() lives in the uuid-ossp extension; synchronize used
    // to create it implicitly, so a migrated DB must create it explicitly.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "startWeightKg" numeric(5,2) NOT NULL, "targetWeightKg" numeric(5,2) NOT NULL, "preferredWeeklyChangeKg" numeric(4,2) NOT NULL, "startDate" date NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_26e17b251afab35580dff769223" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meal_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mealEntryId" uuid NOT NULL, "name" character varying NOT NULL, "quantityDescription" character varying NOT NULL, "calories" numeric(7,2) NOT NULL, "proteinGrams" numeric(6,2) NOT NULL, "carbsGrams" numeric(6,2) NOT NULL, "fatGrams" numeric(6,2) NOT NULL, CONSTRAINT "PK_1e2d1209132a6ae53837e349a60" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meal_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "mealName" character varying NOT NULL, "mealType" character varying NOT NULL, "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "totalCalories" numeric(7,2) NOT NULL, "proteinGrams" numeric(6,2) NOT NULL, "carbsGrams" numeric(6,2) NOT NULL, "fatGrams" numeric(6,2) NOT NULL, "source" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b69a336a32fc8e1a770994db17d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_profiles" ("userId" uuid NOT NULL, "age" integer NOT NULL, "sex" character varying NOT NULL, "heightCm" numeric(5,2) NOT NULL, "activityLevel" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8481388d6325e752cd4d7e26c6d" PRIMARY KEY ("userId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "weight_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "weightKg" numeric(5,2) NOT NULL, "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_31b8520819a1fde89cc47613dec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" ADD CONSTRAINT "FK_57dd8a3fc26eb760d076bf8840e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" ADD CONSTRAINT "FK_f901ba8aec6c83efe0982406459" FOREIGN KEY ("mealEntryId") REFERENCES "meal_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_entries" ADD CONSTRAINT "FK_7ccaff4cae6d8a2225d5d5051b0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "weight_entries" ADD CONSTRAINT "FK_d7379e334d06372b313c92fdf9a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "weight_entries" DROP CONSTRAINT "FK_d7379e334d06372b313c92fdf9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_8481388d6325e752cd4d7e26c6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_entries" DROP CONSTRAINT "FK_7ccaff4cae6d8a2225d5d5051b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meal_items" DROP CONSTRAINT "FK_f901ba8aec6c83efe0982406459"`,
    );
    await queryRunner.query(
      `ALTER TABLE "goals" DROP CONSTRAINT "FK_57dd8a3fc26eb760d076bf8840e"`,
    );
    await queryRunner.query(`DROP TABLE "weight_entries"`);
    await queryRunner.query(`DROP TABLE "user_profiles"`);
    await queryRunner.query(`DROP TABLE "meal_entries"`);
    await queryRunner.query(`DROP TABLE "meal_items"`);
    await queryRunner.query(`DROP TABLE "goals"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
