import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingVerificationStatus1700000000011 implements MigrationInterface {
  name = 'AddPendingVerificationStatus1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'pending_verification' to the session_status enum
    await queryRunner.query(`
      ALTER TYPE "whatsapp_sessions_status_enum"
      ADD VALUE IF NOT EXISTS 'pending_verification'
      BEFORE 'connected'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // In production, you would recreate the type
    // This is a no-op for safety
  }
}
