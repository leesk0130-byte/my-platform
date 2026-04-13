/**
 * /api/posts/:idOrSlug
 *   GET    — by slug OR numeric id  (public; drafts visible only to admin)
 *   PUT    — by numeric id   [admin]
 *   DELETE — by numeric id   [admin]
 *
 * Pages Functions routing can't have both [slug].js and [id] at the same level,
 * so this single dynamic file dispatches by param shape + method.
 */
import { json, error } from '../../_lib/http.js';
import { verifyAdmin } from '../../_lib/admin-auth.js';
import { slugify, uniqueSlug } from '../../_lib/slug.js';

const VALID_TYPES = new Set(['news', 'guide', 'must-know', 'article']);
const VALID_STATUS = new Set(['draft', 'published', 'archived']);

function isNumericId(v) {
  return /^\d+$/.test(String(v || ''));
}

async function findPost(db, key) {
  if (isNumericId(key)) {
    return await db.prepare('SELECT * FROM posts WHERE id = ?').bind(Number(key)).first();
  }
  return await db.prepare('SELECT * FROM posts WHERE slug = ?').bind(String(key)).first();
}

export async function onRequestGet({ env, request, params }) {
  const key = params.idOrSlug;
  try {
    const row = await findPost(env.DB, key);
    if (!row) return error('Not found', 404);

    if (row.status !== 'published') {
      const auth = await verifyAdmin(request, env);
      if (!auth.ok) return error('Not found', 404);
    }

    // increment views (best-effort, don't fail request on error)
    try {
      await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(row.id).run();
      row.views = (row.views || 0) + 1;
    } catch (_) {}

    return json(row);
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPut({ env, request, params }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return error(auth.error, auth.status);

  const key = params.idOrSlug;
  if (!isNumericId(key)) return error('PUT requires numeric id', 400);
  const id = Number(key);

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return error('Invalid JSON body', 400);
  }

  const current = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
  if (!current) return error('Not found', 404);

  const type = body.type != null ? body.type : current.type;
  if (!VALID_TYPES.has(type)) return error('Invalid type', 400);

  const status = body.status != null ? body.status : current.status;
  if (!VALID_STATUS.has(status)) return error('Invalid status', 400);

  const title = body.title != null ? String(body.title).trim() : current.title;
  if (!title) return error('title required', 400);

  let slug = current.slug;
  if (body.slug != null && body.slug !== current.slug) {
    const base = slugify(body.slug) || slugify(title) || 'post';
    slug = await uniqueSlug(env.DB, base, id);
  }

  const category = body.category !== undefined ? body.category : current.category;
  const tags = body.tags !== undefined ? body.tags : current.tags;
  const excerpt = body.excerpt !== undefined ? body.excerpt : current.excerpt;
  const content_html = body.content_html != null ? body.content_html : current.content_html;
  const cover_image = body.cover_image !== undefined ? body.cover_image : current.cover_image;
  const pinned = body.pinned != null ? (body.pinned ? 1 : 0) : current.pinned;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let published_at = current.published_at;
  if (current.status !== 'published' && status === 'published') {
    published_at = now;
  }

  try {
    await env.DB.prepare(
      `UPDATE posts SET type=?, slug=?, title=?, category=?, tags=?, excerpt=?, content_html=?, cover_image=?, status=?, pinned=?, updated_at=?, published_at=? WHERE id=?`
    ).bind(type, slug, title, category, tags, excerpt, content_html, cover_image, status, pinned, now, published_at, id).run();

    const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    return json(row);
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestDelete({ env, request, params }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return error(auth.error, auth.status);

  const key = params.idOrSlug;
  if (!isNumericId(key)) return error('DELETE requires numeric id', 400);
  const id = Number(key);

  try {
    const row = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!row) return error('Not found', 404);
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return json({ ok: true });
  } catch (e) {
    return error(e.message, 500);
  }
}
