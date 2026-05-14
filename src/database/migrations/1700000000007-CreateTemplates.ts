import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplates1700000000007 implements MigrationInterface {
  name = 'CreateTemplates1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "template_category_enum" AS ENUM ('otp', 'marketing', 'utility', 'transactional')
    `);
    await queryRunner.query(`
      CREATE TYPE "template_status_enum" AS ENUM ('draft', 'active', 'archived')
    `);

    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "category" "template_category_enum" NOT NULL,
        "body" TEXT NOT NULL,
        "variables" JSONB NOT NULL DEFAULT '[]',
        "language" VARCHAR(10) NOT NULL DEFAULT 'en',
        "status" "template_status_enum" NOT NULL DEFAULT 'draft',
        "version" INT NOT NULL DEFAULT 1,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_templates_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_template_version" CHECK ("version" > 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_templates_tenant_id" ON "templates" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_templates_tenant_category" ON "templates" ("tenant_id", "category")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_templates_tenant_name_version"
      ON "templates" ("tenant_id", "name", "version")
      WHERE "is_deleted" = false
    `);

    // Add FK from messages.template_id to templates.id
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD CONSTRAINT "FK_messages_template"
      FOREIGN KEY ("template_id") REFERENCES "templates" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_template"`,
    );
    await queryRunner.query(`DROP TABLE "templates"`);
    await queryRunner.query(`DROP TYPE "template_status_enum"`);
    await queryRunner.query(`DROP TYPE "template_category_enum"`);
  }
}
