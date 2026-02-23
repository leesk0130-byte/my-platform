/**
 * 1번 형식(회사 목록 테이블) 페이지에서 데이터를 수집해
 * 2번 형식(이름, 설명, 숫자, 카테고리) CSV로 저장합니다.
 *
 * 사용법:
 *   1. company-list-urls.txt 에 50개 페이지 주소를 한 줄에 하나씩 입력
 *   2. scripts 폴더에서: npm install  (최초 1회)
 *   3. node scrape-company-list.js
 *
 * 출력: scripts/company-list-output.csv
 */

const fs = require('fs');
const path = require('path');

const URL_FILE = path.join(__dirname, 'company-list-urls.txt');
const OUTPUT_CSV = path.join(__dirname, 'company-list-output.csv');
const DELAY_MS = 800; // 페이지 간 대기(서버 부담 줄이기)

function loadCheerio() {
  try {
    return require('cheerio');
  } catch (e) {
    console.error('cheerio가 없습니다. scripts 폴더에서 npm install 을 먼저 실행하세요.');
    process.exit(1);
  }
}

function parsePage(html, cheerio, selectors) {
  const $ = cheerio.load(html);
  const rows = [];
  $(selectors.rowSelector).each((i, el) => {
    const $row = $(el);
    const name = extractText($, $row.find(selectors.columns.name));
    const desc = extractText($, $row.find(selectors.columns.desc));
    const count = extractText($, $row.find(selectors.columns.count));
    const cat1 = extractText($, $row.find(selectors.columns.categories1));
    const cat2 = extractText($, $row.find(selectors.columns.categories2));
    const categories = [cat1, cat2].filter(Boolean).join(', ');
    if (name) rows.push({ name, desc, count, categories });
  });
  return rows;
}

function readUrls() {
  const text = fs.readFileSync(URL_FILE, 'utf8');
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 페이지 HTML에서 행 목록을 추출합니다.
 * 실제 사이트 구조에 맞게 selector를 수정해야 합니다.
 *
 * 예시 (테이블인 경우):
 *   rowSelector: 'table tbody tr' 또는 '.list-item'
 *   cellSelector: 'td' 또는 '.name', '.desc' 등
 */
function getSelectors() {
  // ▼ 실제 페이지 HTML 구조에 맞게 아래를 수정하세요 ▼
  return {
    rowSelector: 'table tbody tr',  // 각 회사 행 (또는 .company-row, .list-item 등)
    columns: {
      name: 'td:nth-child(1)',      // 회사/브랜드명
      desc: 'td:nth-child(2)',      // 설명
      extra: 'td:nth-child(3)',     // seed/비공개 등 (필요시 사용)
      count: 'td:nth-child(4)',     // 인원 수 (17명, 20명 등)
      categories1: 'td:nth-child(5)', // 주 카테고리
      categories2: 'td:nth-child(6)', // 부 카테고리
    },
  };
}

function extractText($, el) {
  if (!el || !el.length) return '';
  return $(el).text().replace(/\s+/g, ' ').trim();
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function escapeCsvCell(s) {
  if (s == null) return '';
  const t = String(s);
  if (/[",\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

function toCsvRow(obj) {
  return [obj.name, obj.desc, obj.count, obj.categories].map(escapeCsvCell).join(',');
}

async function main() {
  const $ = loadCheerio();
  const urls = readUrls();
  if (!urls.length) {
    console.error('company-list-urls.txt에 URL이 없습니다.');
    process.exit(1);
  }

  const selectors = getSelectors();
  const allRows = [];
  const BOM = '\uFEFF';

  console.log(`총 ${urls.length}개 페이지 수집 예정...`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const html = await fetchPage(url);
      const rows = parsePage(html, $, selectors);
      allRows.push(...rows);
      console.log(`[${i + 1}/${urls.length}] ${url} → ${rows.length}건`);
    } catch (err) {
      console.error(`[${i + 1}/${urls.length}] 실패: ${url}`, err.message);
    }
    if (i < urls.length - 1) await sleep(DELAY_MS);
  }

  const header = '이름,설명,숫자,카테고리';
  const body = allRows.map(toCsvRow).join('\n');
  fs.writeFileSync(OUTPUT_CSV, BOM + header + '\n' + body, 'utf8');
  console.log(`\n완료. ${allRows.length}건 → ${OUTPUT_CSV}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
