import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1700000000001 implements MigrationInterface {
  name = 'CreateTenants1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "tenant_status_enum" AS ENUM ('active', 'suspended', 'deleted')
    `);
    await queryRunner.query(`
      CREATE TYPE "tenant_plan_enum" AS ENUM ('starter', 'professional', 'enterprise')
    `);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "company_name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "status" "tenant_status_enum" NOT NULL DEFAULT 'active',
        "plan" "tenant_plan_enum" NOT NULL DEFAULT 'starter',
        "rate_limit_per_minute" INT NOT NULL DEFAULT 60,
        "daily_message_limit" INT NOT NULL DEFAULT 1000,
        "settings" JSONB NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_tenants_rate_limit" CHECK ("rate_limit_per_minute" > 0),
        CONSTRAINT "CHK_tenants_daily_limit" CHECK ("daily_message_limit" > 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_tenants_status" ON "tenants" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "tenant_plan_enum"`);
    await queryRunner.query(`DROP TYPE "tenant_status_enum"`);
  }
}
