import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantSubscriptions1700000000014 implements MigrationInterface {
  name = 'AddTenantSubscriptions1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "tenants_subscription_status_enum" AS ENUM (
          'trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "subscription_status" "tenants_subscription_status_enum" NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "subscription_started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "subscription_auto_renew" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "subscription_suspended_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "subscription_suspension_reason" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "subscription_last_renewed_at" TIMESTAMPTZ
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_subscription_status" ON "tenants" ("subscription_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_subscription_ends_at" ON "tenants" ("subscription_ends_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenants_subscription_ends_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenants_subscription_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "tenants"
        DROP COLUMN IF EXISTS "subscription_last_renewed_at",
        DROP COLUMN IF EXISTS "subscription_suspension_reason",
        DROP COLUMN IF EXISTS "subscription_suspended_at",
        DROP COLUMN IF EXISTS "subscription_auto_renew",
        DROP COLUMN IF EXISTS "subscription_ends_at",
        DROP COLUMN IF EXISTS "subscription_started_at",
        DROP COLUMN IF EXISTS "subscription_status"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "tenants_subscription_status_enum"`,
    );
  }
}
