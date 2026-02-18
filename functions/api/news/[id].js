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

async function verifyOperator(request, env) {
  var auth = request.headers.get('Authorization') || '';
  var token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  try {
    var res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + token);
    if (!res.ok) return false;
    var data = await res.json();
    var operatorEmail = (env.OPERATOR_EMAIL || 'leesk0130@point3.team').toLowerCase();
    if ((data.email || '').toLowerCase() !== operatorEmail) return false;
    if (Number(data.exp) < Date.now() / 1000) return false;
    return true;
  } catch (e) { return false; }
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}