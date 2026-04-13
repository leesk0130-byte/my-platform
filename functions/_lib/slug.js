/**
 * Slug helpers. Allows Hangul characters.
 */
export function slugify(input) {
  if (!input) return '';
  let s = String(input).trim().toLowerCase();
  // Remove characters that aren't letters (any script), numbers, space, or hyphen
  s = s.replace(/[^\p{L}\p{N}\s-]+/gu, '');
  s = s.replace(/\s+/g, '-');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s.slice(0, 120) || 'post';
}

/**
 * Given a desired base slug, return a unique slug by appending -2, -3, ...
 * excludeId: when updating, ignore that row's own slug.
 */
export async function uniqueSlug(db, base, excludeId = null) {
  const probe = async (candidate) => {
    const row = excludeId
      ? await db.prepare('SELECT id FROM posts WHERE slug = ? AND id != ?').bind(candidate, excludeId).first()
      : await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(candidate).first();
    return !row;
  };
  if (await probe(base)) return base;
  for (let i = 2; i < 500; i++) {
    const c = `${base}-${i}`;
    if (await probe(c)) return c;
  }
  return `${base}-${Date.now()}`;
}
