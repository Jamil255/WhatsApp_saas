import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessages1700000000006 implements MigrationInterface {
  name = 'CreateMessages1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM ('text', 'otp', 'image', 'video', 'document', 'audio', 'template')
    `);
    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM ('queued', 'processing', 'sent', 'delivered', 'read', 'failed')
    `);
    await queryRunner.query(`
      CREATE TYPE "message_direction_enum" AS ENUM ('outbound', 'inbound')
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "to_number" VARCHAR(20) NOT NULL,
        "from_number" VARCHAR(20),
        "message_type" "message_type_enum" NOT NULL,
        "body" TEXT,
        "media_metadata" JSONB,
        "template_id" UUID,
        "template_variables" JSONB,
        "status" "message_status_enum" NOT NULL DEFAULT 'queued',
        "direction" "message_direction_enum" NOT NULL DEFAULT 'outbound',
        "whatsapp_message_id" VARCHAR(255),
        "batch_id" VARCHAR(64),
        "retry_count" INT NOT NULL DEFAULT 0,
        "error_reason" VARCHAR(500),
        "queued_at" TIMESTAMPTZ DEFAULT now(),
        "sent_at" TIMESTAMPTZ,
        "delivered_at" TIMESTAMPTZ,
        "read_at" TIMESTAMPTZ,
        "failed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_retry_count" CHECK ("retry_count" >= 0 AND "retry_count" <= 5)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_messages_tenant_id" ON "messages" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_tenant_status" ON "messages" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_tenant_created" ON "messages" ("tenant_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_wa_msg_id" ON "messages" ("whatsapp_message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_batch_id" ON "messages" ("batch_id") WHERE "batch_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_to_number" ON "messages" ("tenant_id", "to_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_queued" ON "messages" ("status") WHERE "status" = 'queued'`,
    );

    await queryRunner.query(`
      CREATE TABLE "message_status_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "message_id" UUID NOT NULL,
        "status" "message_status_enum" NOT NULL,
        "source" VARCHAR(50) NOT NULL,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_status_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_status_logs_message" FOREIGN KEY ("message_id")
          REFERENCES "messages" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_status_logs_message_id" ON "message_status_logs" ("message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_status_logs_message_created" ON "message_status_logs" ("message_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "message_status_logs"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "message_direction_enum"`);
    await queryRunner.query(`DROP TYPE "message_status_enum"`);
    await queryRunner.query(`DROP TYPE "message_type_enum"`);
  }
}
