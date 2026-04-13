-- posts 테이블 (D1) — 가맹점숲 통합 콘텐츠 스토어
-- type: news | guide | must-know | article
CREATE TABLE IF NOT EXISTS posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK (type IN ('news','guide','must-know','article')),
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  category     TEXT,
  tags         TEXT,               -- 쉼표구분
  excerpt      TEXT,
  content_html TEXT NOT NULL,
  cover_image  TEXT,
  status       TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  views        INTEGER NOT NULL DEFAULT 0,
  pinned       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_type_status_published ON posts(type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
