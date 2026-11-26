import { neon } from '@neondatabase/serverless';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'vs_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;

export function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(process.env.DATABASE_URL);
}

export function json(res, status, value) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.end(JSON.stringify(value));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed' });
}

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body !== 'string') return {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

export function requireSameOrigin(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    json(res, 403, { error: 'Request origin could not be verified' });
    return false;
  }
  try {
    if (new URL(origin).host !== host) {
      json(res, 403, { error: 'Cross-origin request rejected' });
      return false;
    }
  } catch {
    json(res, 403, { error: 'Request origin could not be verified' });
    return false;
  }
  return true;
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }
  return secret;
}

function sign(value) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function cookieValue(req) {
  const cookies = (req.headers.cookie || '').split(';');
  const item = cookies.find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`));
  return item ? item.trim().slice(SESSION_COOKIE.length + 1) : '';
}

export function authenticatedEmail(req) {
  const token = cookieValue(req);
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  try {
    const expected = sign(payload);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.exp <= Date.now() || typeof session.email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(session.email)) return null;
    return session.email;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + SESSION_SECONDS * 1000
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`);
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export async function hashAdminPassword(password) {
  if (typeof password !== 'string' || password.length < 16 || password.length > 1024) {
    throw new Error('Admin password must be 16–1024 characters');
  }
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

export async function verifyAdminPassword(candidate, saltEncoded, hashEncoded) {
  if (typeof candidate !== 'string' || candidate.length > 1024) return false;
  try {
    const salt = Buffer.from(saltEncoded, 'base64');
    const expected = Buffer.from(hashEncoded, 'base64');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = await scryptAsync(candidate, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function loginKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const address = req.headers['x-real-ip'] ||
    (typeof forwarded === 'string' ? forwarded.split(',').pop() : '') ||
    req.socket?.remoteAddress || 'unknown';
  return createHmac('sha256', sessionSecret()).update(address.trim()).digest('hex');
}

export function newSlug(title) {
  const base = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'blog-post';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

export function validatePost(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const values = {
    title: typeof input.title === 'string' ? input.title.trim() : '',
    category: typeof input.category === 'string' ? input.category.trim() : '',
    excerpt: typeof input.excerpt === 'string' ? input.excerpt.trim() : '',
    body: typeof input.body === 'string' ? input.body.trim() : '',
    image_url: typeof input.image_url === 'string' ? input.image_url.trim() : ''
  };
  if (values.title.length < 3 || values.title.length > 160) return 'Title must be 3–160 characters';
  if (values.category.length < 2 || values.category.length > 60) return 'Category must be 2–60 characters';
  if (values.excerpt.length < 10 || values.excerpt.length > 400) return 'Excerpt must be 10–400 characters';
  if (values.body.length < 30 || values.body.length > 30000) return 'Article must be 30–30,000 characters';
  if (values.image_url.length > 1000) return 'Image URL is too long';
  if (values.image_url) {
    try {
      const url = new URL(values.image_url, 'https://example.invalid');
      if (!['http:', 'https:'].includes(url.protocol)) return 'Image must use HTTP or HTTPS';
    } catch {
      return 'Image URL is invalid';
    }
  }
  return values;
}
