import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpLogin1700000000010 implements MigrationInterface {
  name = 'AddOtpLogin1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add phone_number column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone_number" VARCHAR(20) DEFAULT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_phone_number" UNIQUE ("phone_number")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_phone_number" ON "users" ("phone_number")
      WHERE "phone_number" IS NOT NULL
    `);

    // 2. Create otp_verifications table
    await queryRunner.query(`
      CREATE TABLE "otp_verifications" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "phone_number" VARCHAR(20) NOT NULL,
        "otp_hash" VARCHAR(64) NOT NULL,
        "tenant_id" UUID,
        "attempts" INT NOT NULL DEFAULT 0,
        "max_attempts" INT NOT NULL DEFAULT 3,
        "is_used" BOOLEAN NOT NULL DEFAULT false,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_otp_verifications_phone_created"
      ON "otp_verifications" ("phone_number", "created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_otp_verifications_lookup"
      ON "otp_verifications" ("phone_number", "is_used", "expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop otp_verifications
    await queryRunner.query(`DROP INDEX "IDX_otp_verifications_lookup"`);
    await queryRunner.query(`DROP INDEX "IDX_otp_verifications_phone_created"`);
    await queryRunner.query(`DROP TABLE "otp_verifications"`);

    // Remove phone_number from users
    await queryRunner.query(`DROP INDEX "IDX_users_phone_number"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_phone_number"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "phone_number"`);
  }
}
