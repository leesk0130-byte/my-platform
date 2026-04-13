/**
 * Compat shim for /api/news/:id  (GET only).
 * Writes are 410 Gone — use /api/posts/:id.
 */
import { json, error } from '../../_lib/http.js';

function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = new Date(String(ts).replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (_) { return ''; }
}

export async function onRequestGet({ env, params }) {
  const key = params.id;
  try {
    let row;
    if (/^\d+$/.test(String(key))) {
      row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND type = 'news'").bind(Number(key)).first();
    } else {
      row = await env.DB.prepare("SELECT * FROM posts WHERE slug = ? AND type = 'news'").bind(String(key)).first();
    }
    if (!row || row.status !== 'published') return error('Not found', 404);
    try { await env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').bind(row.id).run(); } catch (_) {}
    return json({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category || 'general',
      content: row.content_html,
      excerpt: row.excerpt,
      date: formatDate(row.published_at || row.created_at),
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPut() {
  return error('Deprecated. Use PUT /api/posts/:id.', 410);
}

export async function onRequestDelete() {
  return error('Deprecated. Use DELETE /api/posts/:id.', 410);
}
