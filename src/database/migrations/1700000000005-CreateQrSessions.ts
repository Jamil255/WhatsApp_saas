import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQrSessions1700000000005 implements MigrationInterface {
  name = 'CreateQrSessions1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "qr_status_enum" AS ENUM ('generating', 'active', 'scanned', 'expired', 'connected')
    `);

    await queryRunner.query(`
      CREATE TABLE "qr_sessions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL,
        "qr_data" TEXT,
        "status" "qr_status_enum" NOT NULL DEFAULT 'generating',
        "attempt" INT NOT NULL DEFAULT 1,
        "max_attempts" INT NOT NULL DEFAULT 5,
        "expires_at" TIMESTAMPTZ,
        "scanned_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_qr_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_qr_sessions_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_qr_attempt_range" CHECK ("attempt" >= 1 AND "attempt" <= "max_attempts")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_qr_sessions_tenant_status" ON "qr_sessions" ("tenant_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_qr_sessions_expires_at" ON "qr_sessions" ("expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "qr_sessions"`);
    await queryRunner.query(`DROP TYPE "qr_status_enum"`);
  }
}
