/**
 * Strip UTF-8 BOM from HTML files so DOCTYPE is the first thing the browser sees (fixes Quirks Mode).
 * Run from project root: node scripts/strip-bom-html.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlFiles = [
  'index.html', 'community.html', 'write.html', 'calculator.html', 'pg.html',
  'edit.html', 'calculator-saved.html', 'bookmarks.html', 'news.html', 'about.html',
  'must-know.html', 'verify.html', 'privacy.html', 'terms.html',
  'must-know/cash-receipt.html', 'must-know/chargeback.html', 'must-know/review.html',
  'must-know/tax-invoice.html', 'must-know/virtual-account.html', 'must-know/refund.html',
  'must-know/settlement-hold.html', 'must-know/settlement-delay.html',
  'admin/news.html'
];

let stripped = 0;
for (const f of htmlFiles) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const buf = fs.readFileSync(p);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    fs.writeFileSync(p, buf.slice(3), { encoding: 'binary' });
    console.log('BOM 제거:', f);
    stripped++;
  }
}
console.log(stripped ? '완료. Quirks Mode 해결을 위해 HTML ' + stripped + '개에서 BOM 제거함.' : 'BOM 없음. 모든 HTML이 이미 올바릅니다.');
