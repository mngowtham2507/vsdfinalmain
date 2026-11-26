import {
  authenticatedEmail,
  database,
  json,
  methodNotAllowed,
  readJson,
  requireSameOrigin,
  validatePost
} from '../../lib/server.js';

export default async function handler(req, res) {
  try {
    if (!['PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['PATCH', 'DELETE']);
    if (!requireSameOrigin(req, res)) return;
    if (!authenticatedEmail(req)) return json(res, 401, { error: 'Sign in required.' });

    const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
    const sql = database();
    if (req.method === 'DELETE') {
      const deleted = await sql`DELETE FROM blog_posts WHERE slug = ${slug} RETURNING slug`;
      if (!deleted.length) return json(res, 404, { error: 'Blog post not found.' });
      return json(res, 200, { deleted: true });
    }

    const input = validatePost(readJson(req));
    if (typeof input === 'string') return json(res, 400, { error: input });
    const readMinutes = Math.max(1, Math.ceil(input.body.split(/\s+/).length / 200));
    const updated = await sql`
      UPDATE blog_posts
      SET title = ${input.title}, category = ${input.category}, excerpt = ${input.excerpt},
        body = ${input.body}, image_url = ${input.image_url || null},
        read_minutes = ${readMinutes}, updated_at = now()
      WHERE slug = ${slug}
      RETURNING slug, title, category, excerpt, body, image_url, read_minutes, created_at, updated_at
    `;
    if (!updated.length) return json(res, 404, { error: 'Blog post not found.' });
    return json(res, 200, { post: updated[0] });
  } catch (error) {
    console.error('Blog post request failed:', error instanceof Error ? error.name : 'unknown error');
    return json(res, 500, { error: 'Could not update or remove the blog post.' });
  }
}
