/**
 * GET /api/news?limit=20&offset=0  -- public
 * POST /api/news                   -- operator only (Firebase token)
 */

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function randomId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getEmailFromToken(token) {
  try {
    var parts = token.split('.');
    if (parts.length < 2) return '';
    var payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    var pad = payload.length % 4;
    if (pad) payload += new Array(5 - pad).join('=');
    var json = atob(payload);
    var data = JSON.parse(json);
    return (data.email || '').toLowerCase();
  } catch (e) {
    return '';
  }
}

async function verifyOperator(request, env) {
  var auth = request.headers.get('Authorization') || '';
  var token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  var email = getEmailFromToken(token);
  var operatorEmail = (env.OPERATOR_EMAIL || 'leesk0130@point3.team').toLowerCase();
  return email && email === operatorEmail;
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestGet(context) {
  var env = context.env;
  var request = context.request;
  var url = new URL(request.url);
  var limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);
  var offset = Number(url.searchParams.get('offset')) || 0;
  try {
    var stmt = await env.DB.prepare(
      'SELECT id, title, category, content, created_at, updated_at FROM news ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();
    var countRow = await env.DB.prepare('SELECT COUNT(*) as total FROM news').first();
    var items = (stmt.results || []).map(function(r) {
      return { id: r.id, title: r.title, category: r.category, content: r.content, date: formatDate(r.created_at), created_at: r.created_at, updated_at: r.updated_at };
    });
    return json({ items: items, total: (countRow && countRow.total) || 0 });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;
  var ok = await verifyOperator(request, env);
  if (!ok) return json({ error: 'Unauthorized' }, 401);
  try {
    var body = await request.json();
    var title = body.title;
    var category = body.category || 'general';
    var content = body.content;
    if (!title || !content) return json({ error: 'title and content required' }, 400);
    var id = randomId();
    var now = Date.now();
    await env.DB.prepare(
      'INSERT INTO news (id, title, category, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, title, category, content, now, now).run();
    return json({ id: id, title: title, category: category, content: content, date: formatDate(now), created_at: now }, 201);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}