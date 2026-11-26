import {
  authenticatedEmail,
  clearSessionCookie,
  database,
  json,
  loginKey,
  methodNotAllowed,
  readJson,
  requireSameOrigin,
  setSessionCookie,
  verifyAdminPassword
} from '../lib/server.js';

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return json(res, 200, { authenticated: Boolean(authenticatedEmail(req)) });
    }
    if (req.method === 'DELETE') {
      if (!requireSameOrigin(req, res)) return;
      clearSessionCookie(res);
      return json(res, 200, { authenticated: false });
    }
    if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
    if (!requireSameOrigin(req, res)) return;
    if (!process.env.DATABASE_URL) {
      return json(res, 503, { error: 'Admin setup is incomplete: configure DATABASE_URL in Vercel.' });
    }
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      return json(res, 503, { error: 'Admin setup is incomplete: configure a 32+ character SESSION_SECRET in Vercel.' });
    }

    const sql = database();
    const key = loginKey(req);
    const [existing] = await sql`
      SELECT attempts, window_started_at
      FROM admin_login_attempts
      WHERE ip_hash = ${key}
    `;
    if (existing && Number(existing.attempts) >= MAX_ATTEMPTS &&
        new Date(existing.window_started_at).getTime() > Date.now() - WINDOW_MINUTES * 60 * 1000) {
      return json(res, 429, { error: 'Too many sign-in attempts. Try again in 15 minutes.' });
    }

    const credentials = readJson(req);
    const input = credentials && typeof credentials === 'object' && !Array.isArray(credentials) ? credentials : {};
    const suppliedEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const [admin] = await sql`
      SELECT email, password_salt, password_hash
      FROM admin_users
      WHERE id = 1
    `;
    if (!admin) return json(res, 503, { error: 'Admin account has not been initialized' });

    const passwordValid = await verifyAdminPassword(input.password, admin.password_salt, admin.password_hash);
    const valid = suppliedEmail === admin.email && passwordValid;
    if (!valid) {
      await sql`
        INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at)
        VALUES (${key}, 1, now())
        ON CONFLICT (ip_hash) DO UPDATE SET
          attempts = CASE
            WHEN admin_login_attempts.window_started_at < now() - interval '15 minutes' THEN 1
            ELSE admin_login_attempts.attempts + 1
          END,
          window_started_at = CASE
            WHEN admin_login_attempts.window_started_at < now() - interval '15 minutes' THEN now()
            ELSE admin_login_attempts.window_started_at
          END
      `;
      return json(res, 401, { error: 'Email or password is incorrect' });
    }

    await sql`DELETE FROM admin_login_attempts WHERE ip_hash = ${key}`;
    setSessionCookie(res, admin.email);
    return json(res, 200, { authenticated: true });
  } catch (error) {
    console.error('Admin authentication request failed:', error instanceof Error ? error.name : 'unknown error');
    if (error && typeof error === 'object' && error.code === '42P01') {
      return json(res, 503, { error: 'Admin database tables are missing. Run migrations/001_blog.sql in Neon.' });
    }
    return json(res, 503, { error: 'Could not access Neon. Check DATABASE_URL and the deployment logs.' });
  }
}
