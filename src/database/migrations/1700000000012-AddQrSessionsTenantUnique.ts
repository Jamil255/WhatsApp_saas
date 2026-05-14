import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQrSessionsTenantUnique1700000000012 implements MigrationInterface {
  name = 'AddQrSessionsTenantUnique1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "qr_sessions"
      ADD CONSTRAINT "UQ_qr_sessions_tenant_id" UNIQUE ("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "qr_sessions"
      DROP CONSTRAINT "UQ_qr_sessions_tenant_id"
    `);
  }
}
