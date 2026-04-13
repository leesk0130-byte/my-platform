#!/usr/bin/env node
// gaemjeom-sup: migrate static HTML content (guides, must-know) to D1 posts seed.sql
// Node 18+ only, no external deps. Reads guides/*.html and must-know/*.html,
// extracts <main> body + <h1> title + first <p> excerpt, and writes scripts/seed.sql.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SOURCES = [
  { dir: join(ROOT, 'guides'), type: 'guide' },
  { dir: join(ROOT, 'must-know'), type: 'must-know' },
];

const OUT = join(ROOT, 'scripts', 'seed.sql');

function readHtml(path) {
  let s = readFileSync(path, { encoding: 'utf8' });
  return s.replace(/^\uFEFF/, '');
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const t = stripTags(h1[1]);
    if (t) return t;
  }
  const tt = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (tt) {
    const t = stripTags(tt[1]).replace(/\s*\|\s*가맹점숲.*$/, '').trim();
    if (t) return t;
  }
  return fallback;
}

function extractContent(html) {
  // Remove scripts first globally
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, '');

  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1].trim();

  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1].trim();

  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let body = bodyMatch[1];
    body = body.replace(/<header[\s\S]*?<\/header>/gi, '');
    body = body.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    body = body.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    return body.trim();
  }
  return cleaned.trim();
}

function extractExcerpt(contentHtml) {
  const p = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!p) return '';
  const text = stripTags(p[1]);
  return text.slice(0, 150);
}

function categorize(slug, title) {
  const s = (slug + ' ' + (title || '')).toLowerCase();
  if (/pg-fee|payment-methods|easy-pay|easypay/.test(s)) return 'PG 수수료';
  if (/settlement/.test(s)) return '정산';
  if (/refund|chargeback/.test(s)) return '환불';
  if (/tax|cash-receipt/.test(s)) return '세금';
  if (/virtual-account/.test(s)) return '결제';
  if (/review/.test(s)) return '운영팁';
  return '기타';
}

function sqlEscape(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const now = new Date().toISOString();
const records = [];
const summary = [];

for (const src of SOURCES) {
  if (!existsSync(src.dir)) {
    console.warn(`[skip] missing dir: ${src.dir}`);
    continue;
  }
  const files = readdirSync(src.dir).filter(f => f.endsWith('.html') && f !== 'index.html');
  for (const file of files) {
    const path = join(src.dir, file);
    const raw = readHtml(path);
    const slug = file.replace(/\.html$/, '');
    const title = extractTitle(raw, slug);
    const content = extractContent(raw);
    const excerpt = extractExcerpt(content);
    const category = categorize(slug, title);
    const tags = '';

    records.push({
      type: src.type,
      slug,
      title,
      category,
      tags,
      excerpt,
      content_html: content,
      published_at: now,
    });

    summary.push({ type: src.type, slug, title, len: content.length });
  }
}

// Build seed.sql
const lines = [];
lines.push('-- gaemjeom-sup seed data: guides + must-know → posts');
lines.push(`-- generated at ${now} by scripts/migrate-content-to-d1.mjs`);
lines.push(`-- record count: ${records.length}`);
lines.push('');
lines.push('BEGIN TRANSACTION;');
lines.push('');

for (const r of records) {
  const values = [
    sqlEscape(r.type),
    sqlEscape(r.slug),
    sqlEscape(r.title),
    sqlEscape(r.category),
    sqlEscape(r.tags),
    sqlEscape(r.excerpt),
    sqlEscape(r.content_html),
  ].join(', ');
  lines.push(
    `INSERT OR IGNORE INTO posts (type, slug, title, category, tags, excerpt, content_html, status, published_at) VALUES (${values}, 'published', datetime('now'));`
  );
}

lines.push('');
lines.push('COMMIT;');
lines.push('');

writeFileSync(OUT, lines.join('\n'), { encoding: 'utf8' });

// Log summary
console.log(`\nWrote ${OUT}`);
console.log(`Total records: ${records.length}`);
const byType = summary.reduce((acc, s) => ((acc[s.type] = (acc[s.type] || 0) + 1), acc), {});
console.log(`By type:`, byType);
console.log('\nPer-file summary:');
for (const s of summary) {
  console.log(`  [${s.type}] slug=${s.slug} title="${s.title}" content_len=${s.len}`);
}
