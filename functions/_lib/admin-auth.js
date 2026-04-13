/**
 * Admin authentication for Cloudflare Pages Functions (Workers runtime).
 * HMAC-SHA256 signed session cookie. No Node APIs — Web Crypto only.
 *
 * Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256)
 * Payload: { email, iat, exp }   (unix seconds)
 * Cookie: admin_session   HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7d
 */

export const COOKIE_NAME = 'admin_session';
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes) {
  let str = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(payload, secret) {
  if (!secret) throw new Error('ADMIN_SECRET missing');
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return body + '.' + b64urlEncode(sig);
}

export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const idx = token.indexOf('.');
  if (idx <= 0) return null;
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  try {
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlDecode(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(b64urlDecode(body)));
    const now = Math.floor(Date.now() / 1000);
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf('=');
    if (eq === -1) continue;
    if (p.slice(0, eq) === name) return decodeURIComponent(p.slice(eq + 1));
  }
  return '';
}

/**
 * verifyAdmin — first check for all operator-only endpoints.
 * Returns { ok: true, email } on success, { ok: false, status, error } otherwise.
 */
export async function verifyAdmin(request, env) {
  const secret = env.ADMIN_SECRET || '';
  if (!secret) return { ok: false, status: 503, error: 'ADMIN_SECRET not configured' };
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return { ok: false, status: 401, error: 'Not authenticated' };
  const payload = await verifySession(token, secret);
  if (!payload) return { ok: false, status: 401, error: 'Invalid or expired session' };
  const adminEmail = (env.ADMIN_EMAIL || '').toLowerCase();
  if (adminEmail && (payload.email || '').toLowerCase() !== adminEmail) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true, email: payload.email };
}

export function buildSessionCookie(token, maxAge = COOKIE_MAX_AGE) {
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function buildClearCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
