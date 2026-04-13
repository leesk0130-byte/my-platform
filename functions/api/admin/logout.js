/**
 * POST /api/admin/logout — clear admin_session cookie.
 */
import { json } from '../../_lib/http.js';
import { buildClearCookie } from '../../_lib/admin-auth.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': buildClearCookie() });
}
