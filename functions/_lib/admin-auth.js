/**
 * Admin authentication helper for Cloudflare Pages Functions
 * Checks ADMIN_SECRET cookie to verify operator identity
 */
export function verifyAdmin(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) return false;
  const secret = env.ADMIN_SECRET || '';
  if (!secret) return false;
  return match[1] === secret;
}