function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
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
  var operatorEmail = (env.OPERATOR_EMAIL || 'leesk0130@naver.com').toLowerCase();
  return email && email === operatorEmail;
}

export async function onRequestGet({ env, params }) {
  try {
    var row = await env.DB.prepare(
      'SELECT id, title, category, content, created_at, updated_at FROM news WHERE id = ?'
    ).bind(params.id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json(Object.assign({}, row, { date: formatDate(row.created_at) }));
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function onRequestPut({ env, request, params }) {
  var ok = await verifyOperator(request, env);
  if (!ok) return json({ error: 'Unauthorized' }, 401);
  try {
    var body = await request.json();
    var title = body.title;
    var category = body.category != null ? body.category : undefined;
    var content = body.content;
    if (!title || !content) return json({ error: 'title and content required' }, 400);
    var now = Date.now();
    await env.DB.prepare(
      'UPDATE news SET title = ?, category = ?, content = ?, updated_at = ? WHERE id = ?'
    ).bind(title, category || 'general', content, now, params.id).run();
    var row = await env.DB.prepare(
      'SELECT id, title, category, content, created_at, updated_at FROM news WHERE id = ?'
    ).bind(params.id).first();
    if (!row) return json({ error: 'Not found' }, 404);
    return json(Object.assign({}, row, { date: formatDate(row.created_at) }));
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function onRequestDelete({ env, request, params }) {
  var ok = await verifyOperator(request, env);
  if (!ok) return json({ error: 'Unauthorized' }, 401);
  try {
    await env.DB.prepare('DELETE FROM news WHERE id = ?').bind(params.id).run();
    return json({ success: true });
  } catch (e) { return json({ error: e.message }, 500); }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}