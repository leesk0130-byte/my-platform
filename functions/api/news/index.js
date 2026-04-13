/**
 * Compatibility shim for legacy /api/news.
 * New storage lives in `posts` table (type='news'). This endpoint re-uses
 * /api/posts under the hood so old frontends keep working.
 *
 * GET    — proxies to posts listing (type=news)
 * POST   — 410 Gone (use /api/posts)
 * DELETE — 410 Gone (use /api/posts/:id)
 */
import { json, error } from '../../_lib/http.js';

function formatDate(ts) {
  if (!ts) return '';
  // posts.published_at / created_at is "YYYY-MM-DD HH:MM:SS"
  try {
    const d = new Date(String(ts).replace(' ', 'T') + 'Z');
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (_) { return ''; }
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 100);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const category = url.searchParams.get('category');

  const where = ["type = 'news'", "status = 'published'"];
  const binds = [];
  if (category) { where.push('category = ?'); binds.push(category); }
  const whereSql = 'WHERE ' + where.join(' AND ');

  try {
    const listStmt = env.DB.prepare(
      `SELECT id, slug, title, category, excerpt, content_html, created_at, updated_at, published_at
       FROM posts ${whereSql} ORDER BY pinned DESC, published_at DESC, id DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset);
    const countStmt = env.DB.prepare(`SELECT COUNT(*) AS total FROM posts ${whereSql}`).bind(...binds);
    const [listRes, countRow] = await Promise.all([listStmt.all(), countStmt.first()]);
    const items = (listRes.results || []).map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      category: r.category || 'general',
      content: r.content_html,
      excerpt: r.excerpt,
      date: formatDate(r.published_at || r.created_at),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return json({ items, total: (countRow && countRow.total) || 0 });
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPost() {
  return error('Deprecated. Use POST /api/posts with type="news".', 410);
}

export async function onRequestDelete() {
  return error('Deprecated. Use DELETE /api/posts/:id.', 410);
}
