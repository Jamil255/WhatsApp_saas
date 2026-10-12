import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRichMessageTypes1700000000017 implements MigrationInterface {
  name = 'AddRichMessageTypes1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_schema text;
        enum_name text;
      BEGIN
        SELECT namespace.nspname, enum_type.typname
          INTO enum_schema, enum_name
        FROM pg_attribute attribute
        JOIN pg_class table_class
          ON table_class.oid = attribute.attrelid
        JOIN pg_namespace table_namespace
          ON table_namespace.oid = table_class.relnamespace
        JOIN pg_type enum_type
          ON enum_type.oid = attribute.atttypid
        JOIN pg_namespace namespace
          ON namespace.oid = enum_type.typnamespace
        WHERE table_class.relname = 'messages'
          AND attribute.attname = 'message_type'
          AND table_namespace.nspname = current_schema()
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
        LIMIT 1;

        IF enum_name IS NULL THEN
          RAISE EXCEPTION 'Could not find the enum backing messages.message_type';
        END IF;

        EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', enum_schema, enum_name, 'voice');
        EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', enum_schema, enum_name, 'gif');
        EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', enum_schema, enum_name, 'sticker');
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely without rebuilding every
    // dependent column. Keeping the values is backwards-compatible.
  }
}
