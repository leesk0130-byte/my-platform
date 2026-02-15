-- 뉴스 테이블 (D1)
-- id: uuid, title, category, content, created_at, updated_at (unix ms)
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);
