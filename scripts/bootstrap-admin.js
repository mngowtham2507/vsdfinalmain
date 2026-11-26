import { neon } from '@neondatabase/serverless';
import { hashAdminPassword } from '../lib/server.js';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is not configured correctly');
  }
  if (typeof password !== 'string' || password.length < 16 || password.length > 1024) {
    throw new Error('ADMIN_PASSWORD must contain 16–1024 characters');
  }

  const { salt, hash } = await hashAdminPassword(password);
  const sql = neon(connectionString);
  await sql`
    INSERT INTO admin_users (id, email, password_salt, password_hash)
    VALUES (1, ${email}, ${salt}, ${hash})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      password_salt = EXCLUDED.password_salt,
      password_hash = EXCLUDED.password_hash,
      updated_at = now()
  `;
  console.log('Admin account initialized. The password is stored as a salted hash.');
}

main().catch(() => {
  console.error('Admin bootstrap failed. Check the Neon connection, migration, and credential requirements.');
  process.exitCode = 1;
});
