import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed script — creates the default super admin user.
 *
 * Usage: npx ts-node src/database/seeders/seed.ts
 */
async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1122',
    database: process.env.DB_DATABASE || 'whatsapp_saas',
  });

  await dataSource.initialize();
  console.log('Connected to database.');

  const tenantId = uuidv4();
  const userId = uuidv4();
  const passwordHash = await argon2.hash('admin123456');

  // Create super admin tenant
  await dataSource.query(
    `INSERT INTO tenants (id, company_name, slug, status, plan, rate_limit_per_minute, daily_message_limit, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO NOTHING`,
    [
      tenantId,
      'Platform Admin',
      'platform-admin',
      'active',
      'enterprise',
      1000,
      100000,
      '{}',
    ],
  );

  // Create super admin user
  await dataSource.query(
    `INSERT INTO users (id, tenant_id, name, email, phone_number, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE SET phone_number = EXCLUDED.phone_number`,
    [
      userId,
      tenantId,
      'Super Admin',
      'admin@whatsapp-saas.com',
      '+923320722562',
      passwordHash,
      'super_admin',
      true,
    ],
  );

  console.log('Super admin seeded:');
  console.log('   Email:    admin@gmail.com');
  console.log('   Phone:    +923320722562');
  console.log('   Password: admin123456');
  console.log('   Role:     super_admin');

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
