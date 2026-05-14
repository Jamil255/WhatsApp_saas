import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWhatsAppSessions1700000000004 implements MigrationInterface {
  name = 'CreateWhatsAppSessions1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "session_status_enum" AS ENUM ('connecting', 'connected', 'disconnected', 'destroyed')
    `);

    await queryRunner.query(`
      CREATE TABLE "whatsapp_sessions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "status" "session_status_enum" NOT NULL DEFAULT 'connecting',
        "phone_number" VARCHAR(20),
        "creds" JSONB,
        "account_info" JSONB,
        "reconnect_count" INT NOT NULL DEFAULT 0,
        "connected_at" TIMESTAMPTZ,
        "disconnected_at" TIMESTAMPTZ,
        "last_heartbeat_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_whatsapp_sessions_tenant" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_whatsapp_sessions_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_wa_sessions_status" ON "whatsapp_sessions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wa_sessions_heartbeat" ON "whatsapp_sessions" ("last_heartbeat_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "whatsapp_session_keys" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "session_id" UUID NOT NULL,
        "category" VARCHAR(50) NOT NULL,
        "key_id" VARCHAR(255) NOT NULL,
        "key_data" JSONB NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_session_keys" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_session_keys_lookup" UNIQUE ("session_id", "category", "key_id"),
        CONSTRAINT "FK_session_keys_session" FOREIGN KEY ("session_id")
          REFERENCES "whatsapp_sessions" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_session_keys_session_id" ON "whatsapp_session_keys" ("session_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "whatsapp_session_keys"`);
    await queryRunner.query(`DROP TABLE "whatsapp_sessions"`);
    await queryRunner.query(`DROP TYPE "session_status_enum"`);
  }
}
