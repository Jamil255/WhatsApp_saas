import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanTrialDays1700000000016 implements MigrationInterface {
  name = 'AddPlanTrialDays1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "trial_days" integer NOT NULL DEFAULT 14`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP CONSTRAINT IF EXISTS "CHK_subscription_plans_trial_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD CONSTRAINT "CHK_subscription_plans_trial_days" CHECK ("trial_days" >= 0 AND "trial_days" <= 365)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP CONSTRAINT IF EXISTS "CHK_subscription_plans_trial_days"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP COLUMN IF EXISTS "trial_days"`,
    );
  }
}
