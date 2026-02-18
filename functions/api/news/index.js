/**
 * GET /api/news?limit=20&offset=0  -- public
 * POST /api/news                   -- admin only
 * GET /api/news/:id                -- public
 * DELETE /api/news/:id             -- admin only
 */
import { verifyAdmin } from '../../_lib/admin-auth.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function randomId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestGet(context) {
  const { env, request, params } = context;
  const url = new URL(request.url);

  const id = params && params.id;
  if (id) {
    try {
      const row = await env.DB.prepare(
        'SELECT id, title, category, content, created_at, updated_at FROM news WHERE id = ?'
      ).bind(id).first();
      if (!row) return json({ error: 'Not found' }, 404);
      return json({
        id: row.id, title: row.title, category: row.category,
        content: row.content, date: formatDate(row.created_at),
        created_at: row.created_at, updated_at: row.updated_at,
      });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
  const offset = Number(url.searchParams.get('offset')) || 0;
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, title, category, content, created_at, updated_at FROM news ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    const countRow = await env.DB.prepare('SELECT COUNT(*) as total FROM news').first();
    const items = (results || []).map((r) => ({
      id: r.id, title: r.title, category: r.category,
      content: r.content, date: formatDate(r.created_at),
      created_at: r.created_at, updated_at: r.updated_at,
    }));
    return json({ items, total: (countRow && countRow.total) || 0 });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!verifyAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    const body = await request.json();
    const { title, category, content } = body;
    if (!title || !content) return json({ error: 'title and content are required' }, 400);
    const id = randomId();
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO news (id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, title, category || 'general', content, now, now).run();
    return json({ id, title, category: category || 'general', content, date: formatDate(now), created_at: now }, 201);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestDelete(context) {
  const { env, request, params } = context;
  if (!verifyAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
  const id = params && params.id;
  if (!id) return json({ error: 'id required' }, 400);
  try {
    await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(id).run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}