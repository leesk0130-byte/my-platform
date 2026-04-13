/**
 * POST /api/upload   [admin]
 * multipart/form-data with field "file"  OR  JSON { filename, data: base64 }
 * Returns { url: "data:image/...;base64,..." }  (MVP — inline data URL).
 * Max 2 MB.
 */
import { json, error } from '../_lib/http.js';
import { verifyAdmin } from '../_lib/admin-auth.js';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']);

function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function onRequestPost({ env, request }) {
  const auth = await verifyAdmin(request, env);
  if (!auth.ok) return error(auth.error, auth.status);

  const ctype = request.headers.get('Content-Type') || '';

  try {
    if (ctype.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') return error('file field required', 400);
      if (file.size > MAX_BYTES) return error('File too large (max 2MB)', 413);
      const mime = file.type || 'application/octet-stream';
      if (!ALLOWED.has(mime)) return error('Unsupported image type', 415);
      const buf = new Uint8Array(await file.arrayBuffer());
      const b64 = bytesToBase64(buf);
      return json({ url: `data:${mime};base64,${b64}`, size: buf.length, type: mime });
    }

    if (ctype.includes('application/json')) {
      const body = await request.json();
      const data = body && body.data;
      const mime = (body && body.type) || 'image/png';
      if (!data) return error('data (base64) required', 400);
      if (!ALLOWED.has(mime)) return error('Unsupported image type', 415);
      // estimate decoded size
      const approxBytes = Math.floor(data.length * 3 / 4);
      if (approxBytes > MAX_BYTES) return error('File too large (max 2MB)', 413);
      return json({ url: `data:${mime};base64,${data}`, size: approxBytes, type: mime });
    }

    return error('Unsupported content type', 415);
  } catch (e) {
    return error(e.message, 500);
  }
}
