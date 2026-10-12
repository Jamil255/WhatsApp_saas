import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionPlans1700000000015 implements MigrationInterface {
  name = 'CreateSubscriptionPlans1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_plans" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(120) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "description" VARCHAR(500),
        "monthly_price_cents" INTEGER NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
        "daily_message_limit" INTEGER NOT NULL,
        "rate_limit_per_minute" INTEGER NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "is_public" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscription_plans_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_subscription_plans_price" CHECK ("monthly_price_cents" >= 0),
        CONSTRAINT "CHK_subscription_plans_daily_limit" CHECK ("daily_message_limit" > 0),
        CONSTRAINT "CHK_subscription_plans_rate_limit" CHECK ("rate_limit_per_minute" > 0)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "subscription_plans"
        ("name", "slug", "description", "monthly_price_cents", "currency", "daily_message_limit", "rate_limit_per_minute", "sort_order")
      VALUES
        ('Starter', 'starter', 'For small teams starting with WhatsApp automation.', 0, 'USD', 1000, 60, 10),
        ('Professional', 'professional', 'Higher throughput for growing support and operations teams.', 0, 'USD', 10000, 300, 20),
        ('Enterprise', 'enterprise', 'High-volume capacity for business-critical messaging.', 0, 'USD', 100000, 1000, 30)
      ON CONFLICT ("slug") DO NOTHING
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD COLUMN IF NOT EXISTS "subscription_plan_id" UUID
    `);
    await queryRunner.query(`
      UPDATE "tenants" AS tenant
      SET "subscription_plan_id" = plan."id"
      FROM "subscription_plans" AS plan
      WHERE plan."slug" = tenant."plan"::text
        AND tenant."subscription_plan_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenants"
        ADD CONSTRAINT "FK_tenants_subscription_plan"
        FOREIGN KEY ("subscription_plan_id")
        REFERENCES "subscription_plans"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenants_subscription_plan_id" ON "tenants" ("subscription_plan_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenants_subscription_plan_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "FK_tenants_subscription_plan"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenants" DROP COLUMN IF EXISTS "subscription_plan_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);
  }
}
