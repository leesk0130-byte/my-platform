/**
 * POST /api/admin/login
 * body: { email, password }
 * Sets admin_session (HMAC signed) cookie on success.
 */
import { json, error } from '../../_lib/http.js';
import { signSession, buildSessionCookie, COOKIE_MAX_AGE } from '../../_lib/admin-auth.js';

export async function onRequestPost({ env, request }) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return error('Invalid JSON body', 400);
  }
  const email = (body && body.email || '').trim();
  const password = body && body.password || '';

  const adminEmail = (env.ADMIN_EMAIL || '').trim();
  const adminPassword = env.ADMIN_PASSWORD || '';
  const adminSecret = env.ADMIN_SECRET || '';

  if (!adminEmail || !adminPassword || !adminSecret) {
    return error('Admin credentials not configured (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_SECRET)', 503);
  }
  if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
    return error('Invalid credentials', 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = { email: adminEmail, iat: now, exp: now + COOKIE_MAX_AGE };
  const token = await signSession(payload, adminSecret);

  return json({ ok: true, email: adminEmail }, 200, {
    'Set-Cookie': buildSessionCookie(token),
  });
}

export async function onRequest({ request }) {
  if (request.method !== 'POST') {
    return error('Method not allowed', 405);
  }
}
