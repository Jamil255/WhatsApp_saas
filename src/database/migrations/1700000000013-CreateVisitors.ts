import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVisitors1700000000013 implements MigrationInterface {
  name = 'CreateVisitors1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "visitors" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "visitor_key" VARCHAR(80) NOT NULL,
        "session_id" VARCHAR(80),
        "ip_address" VARCHAR(45),
        "user_agent" VARCHAR(500),
        "landing_path" VARCHAR(500) NOT NULL,
        "last_visited_path" VARCHAR(500) NOT NULL,
        "referrer" VARCHAR(500),
        "utm_source" VARCHAR(120),
        "utm_medium" VARCHAR(120),
        "utm_campaign" VARCHAR(160),
        "page_views" INTEGER NOT NULL DEFAULT 1,
        "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_visitors" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_visitors_visitor_key" UNIQUE ("visitor_key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_visitors_last_seen_at" ON "visitors" ("last_seen_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "visitors"`);
  }
}
