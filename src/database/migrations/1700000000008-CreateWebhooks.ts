import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhooks1700000000008 implements MigrationInterface {
  name = 'CreateWebhooks1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "url" VARCHAR(2048) NOT NULL,
        "secret" VARCHAR(255) NOT NULL,
        "events" JSONB NOT NULL DEFAULT '["*"]',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "failure_count" INT NOT NULL DEFAULT 0,
        "last_success_at" TIMESTAMPTZ,
        "last_failure_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhooks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_webhooks_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_webhooks_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_webhooks_failure_count" CHECK ("failure_count" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "webhook_delivery_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "webhook_id" UUID NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "payload" JSONB NOT NULL,
        "http_status" INT,
        "response_body" TEXT,
        "attempt" INT NOT NULL DEFAULT 1,
        "success" BOOLEAN NOT NULL,
        "error_message" VARCHAR(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_webhook_delivery_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_delivery_logs_webhook" FOREIGN KEY ("webhook_id")
          REFERENCES "webhooks" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_wh_delivery_webhook_id" ON "webhook_delivery_logs" ("webhook_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wh_delivery_created" ON "webhook_delivery_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "webhook_delivery_logs"`);
    await queryRunner.query(`DROP TABLE "webhooks"`);
  }
}
