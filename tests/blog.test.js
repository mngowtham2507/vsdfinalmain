import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticatedEmail,
  hashAdminPassword,
  newSlug,
  requireSameOrigin,
  setSessionCookie,
  validatePost,
  verifyAdminPassword
} from '../lib/server.js';
import authHandler from '../api/auth.js';
import blogCollectionHandler from '../api/blogs.js';
import blogPostHandler from '../api/blogs/[slug].js';

const validPost = {
  title: 'A helpful article',
  category: 'Guides',
  excerpt: 'A short useful summary of the article.',
  body: 'A sufficiently long article body with practical information for readers.',
  image_url: '/banner.jpg'
};

test('validates blog content and accepts a local cover image', () => {
  assert.deepEqual(validatePost(validPost), validPost);
});

test('rejects invalid and script-based blog input', () => {
  assert.equal(validatePost(null).startsWith('Title'), true);
  assert.equal(validatePost({ ...validPost, image_url: 'javascript:alert(1)' }), 'Image must use HTTP or HTTPS');
  assert.equal(validatePost({ ...validPost, title: 'x'.repeat(161) }).startsWith('Title'), true);
});

test('creates URL-safe unique post slugs', () => {
  const first = newSlug('A Simple Guide to Buying');
  const second = newSlug('A Simple Guide to Buying');
  assert.match(first, /^a-simple-guide-to-buying-[a-f0-9]{6}$/);
  assert.notEqual(first, second);
});

test('rejects missing and cross-origin mutation requests', () => {
  const response = {
    statusCode: 0,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
  assert.equal(requireSameOrigin({ headers: {}, socket: {} }, response), false);
  assert.equal(response.statusCode, 403);
  assert.equal(JSON.parse(response.body).error, 'Request origin could not be verified');
});

test('requires an authenticated session for creating, editing, and deleting posts', async () => {
  const response = {
    statusCode: 0,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
  const headers = { origin: 'https://site.example', host: 'site.example' };

  await blogCollectionHandler({ method: 'POST', headers, body: validPost }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(JSON.parse(response.body).error, 'Sign in required.');

  for (const method of ['PATCH', 'DELETE']) {
    response.statusCode = 0;
    await blogPostHandler({ method, headers, query: { slug: 'test-post' } }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(JSON.parse(response.body).error, 'Sign in required.');
  }
});

test('reports missing Neon configuration without attempting a database connection', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  delete process.env.DATABASE_URL;
  process.env.SESSION_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const response = {
    statusCode: 0,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
  try {
    await authHandler({
      method: 'POST',
      headers: { origin: 'https://site.example', host: 'site.example' },
      body: { email: 'admin@example.com', password: 'a-long-test-password-value' }
    }, response);
    assert.equal(response.statusCode, 503);
    assert.match(JSON.parse(response.body).error, /DATABASE_URL/);
  } finally {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});

test('accepts a signed admin session and rejects a tampered cookie', () => {
  process.env.SESSION_SECRET = 'test-secret-with-more-than-thirty-two-characters';
  const response = { setHeader(name, value) { this[name] = value; } };
  setSessionCookie(response, 'admin@example.com');
  const cookie = response['Set-Cookie'].split(';')[0];
  assert.equal(authenticatedEmail({ headers: { cookie } }), 'admin@example.com');
  const [name, value] = cookie.split('=');
  const tampered = `${name}=${value.split('.')[0]}.invalid`;
  assert.equal(authenticatedEmail({ headers: { cookie: tampered } }), null);
});

test('stores admin passwords as salted hashes and enforces a strong password', async () => {
  const password = 'a-long-test-password-value';
  const stored = await hashAdminPassword(password);
  assert.notEqual(stored.hash, password);
  assert.equal(await verifyAdminPassword(password, stored.salt, stored.hash), true);
  assert.equal(await verifyAdminPassword('wrong-password', stored.salt, stored.hash), false);
  await assert.rejects(() => hashAdminPassword('short'));
});
