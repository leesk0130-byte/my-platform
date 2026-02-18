/**
 * POST /api/admin/login
 * body: { email, password }
 * Sets admin_session cookie on success
 */
function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export async function onRequestPost({ env, request }) {
  try {
    const { email, password } = await request.json();
    const adminEmail = env.ADMIN_EMAIL || '';
    const adminPassword = env.ADMIN_PASSWORD || '';
    const adminSecret = env.ADMIN_SECRET || '';
    if (!adminEmail || !adminPassword || !adminSecret) {
      return json({ error: 'Admin not configured' }, 503);
    }
    if (email !== adminEmail || password !== adminPassword) {
      return json({ error: 'Invalid credentials' }, 401);
    }
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    return json({ success: true }, 200, {
      'Set-Cookie': `admin_session=${adminSecret}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict`,
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}