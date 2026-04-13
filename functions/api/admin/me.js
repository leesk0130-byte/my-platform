/**
 * GET /api/admin/me — returns { ok, email } if logged in, else 401.
 */
import { json, error } from '../../_lib/http.js';
import { verifyAdmin } from '../../_lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return error(auth.error, auth.status);
  return json({ ok: true, email: auth.email });
}
