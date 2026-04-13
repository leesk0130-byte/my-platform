/**
 * GET  /api/posts    — public listing
 * POST /api/posts    — admin create
 */
import { json, error } from '../../_lib/http.js';
import { verifyAdmin } from '../../_lib/admin-auth.js';
import { slugify, uniqueSlug } from '../../_lib/slug.js';

const VALID_TYPES = new Set(['news', 'guide', 'must-know', 'article']);
const VALID_STATUS = new Set(['draft', 'published', 'archived']);

function orderBy(sort) {
  switch (sort) {
    case 'views_desc':
      return 'views DESC, published_at DESC';
    case 'published_at_desc':
      return 'published_at DESC, id DESC';
    case 'pinned_first':
    default:
      return 'pinned DESC, published_at DESC, id DESC';
  }
}

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const type = p.get('type');
  const category = p.get('category');
  const q = (p.get('q') || '').trim();
  const limit = Math.min(Math.max(Number(p.get('limit')) || 20, 1), 100);
  const offset = Math.max(Number(p.get('offset')) || 0, 0);
  const sort = p.get('sort') || 'pinned_first';

  // admins may see drafts via ?status=all
  const wantAll = p.get('status') === 'all';
  let isAdmin = false;
  if (wantAll) {
    const a = await verifyAdmin(request, env);
    isAdmin = a.ok;
  }

  const where = [];
  const binds = [];
  if (!isAdmin) {
    where.push("status = 'published'");
  } else if (p.get('status') && p.get('status') !== 'all') {
    where.push('status = ?');
    binds.push(p.get('status'));
  }
  if (type) {
    if (!VALID_TYPES.has(type)) return error('Invalid type', 400);
    where.push('type = ?');
    binds.push(type);
  }
  if (category) {
    where.push('category = ?');
    binds.push(category);
  }
  if (q) {
    where.push('(title LIKE ? OR excerpt LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const order = orderBy(sort);

  try {
    const listSql = `SELECT id, type, slug, title, category, tags, excerpt, cover_image, status, views, pinned, created_at, updated_at, published_at FROM posts ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) AS total FROM posts ${whereSql}`;
    const listStmt = env.DB.prepare(listSql).bind(...binds, limit, offset);
    const countStmt = env.DB.prepare(countSql).bind(...binds);
    const [listRes, countRow] = await Promise.all([listStmt.all(), countStmt.first()]);
    return json({
      items: listRes.results || [],
      total: (countRow && countRow.total) || 0,
      limit,
      offset,
    });
  } catch (e) {
    return error(e.message, 500);
  }
}

export async function onRequestPost({ env, request }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return error(auth.error, auth.status);

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return error('Invalid JSON body', 400);
  }

  const type = body.type;
  const title = (body.title || '').trim();
  const content_html = body.content_html || '';
  if (!VALID_TYPES.has(type)) return error('Invalid or missing type', 400);
  if (!title) return error('title required', 400);
  if (!content_html) return error('content_html required', 400);

  const status = VALID_STATUS.has(body.status) ? body.status : 'published';
  const category = body.category || null;
  const tags = body.tags || null;
  const excerpt = body.excerpt || null;
  const cover_image = body.cover_image || null;
  const pinned = body.pinned ? 1 : 0;

  let baseSlug = slugify(body.slug || title);
  if (!baseSlug) baseSlug = 'post';

  try {
    const slug = await uniqueSlug(env.DB, baseSlug);
    const published_at = status === 'published' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null;

    const res = await env.DB.prepare(
      `INSERT INTO posts (type, slug, title, category, tags, excerpt, content_html, cover_image, status, pinned, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(type, slug, title, category, tags, excerpt, content_html, cover_image, status, pinned, published_at).run();

    const id = res.meta && res.meta.last_row_id;
    const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    return json(row, 201);
  } catch (e) {
    return error(e.message, 500);
  }
}
