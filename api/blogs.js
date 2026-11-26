import {
  authenticatedEmail,
  database,
  json,
  methodNotAllowed,
  newSlug,
  readJson,
  requireSameOrigin,
  validatePost
} from '../lib/server.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const sql = database();
      const posts = await sql`
        SELECT slug, title, category, excerpt, body, image_url, read_minutes, created_at, updated_at
        FROM blog_posts
        ORDER BY created_at DESC
      `;
      return json(res, 200, { posts });
    }
    if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);
    if (!requireSameOrigin(req, res)) return;
    if (!authenticatedEmail(req)) return json(res, 401, { error: 'Sign in required' });

    const input = validatePost(readJson(req));
    if (typeof input === 'string') return json(res, 400, { error: input });
    const sql = database();
    const slug = newSlug(input.title);
    const readMinutes = Math.max(1, Math.ceil(input.body.split(/\s+/).length / 200));
    const [post] = await sql`
      INSERT INTO blog_posts (slug, title, category, excerpt, body, image_url, read_minutes)
      VALUES (${slug}, ${input.title}, ${input.category}, ${input.excerpt}, ${input.body},
        ${input.image_url || null}, ${readMinutes})
      RETURNING slug, title, category, excerpt, body, image_url, read_minutes, created_at, updated_at
    `;
    return json(res, 201, { post });
  } catch (error) {
    console.error('Blog collection request failed:', error instanceof Error ? error.name : 'unknown error');
    return json(res, 500, { error: 'Could not load or save blog posts' });
  }
}
