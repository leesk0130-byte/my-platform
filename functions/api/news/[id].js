import { verifyAdmin } from '../../../_lib/admin-auth.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export async function onRequestGet({ env, params }) {
  const id = params.id;
  try {
    const row = await env.DB.prepare(
      'SELECT id, title, category, content, created_at, updated_at FROM news WHERE id = ?'
    ).bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json({ ...row, date: formatDate(row.created_at) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestDelete({ env, request, params }) {
  if (!verifyAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
  try {
    await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(params.id).run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}