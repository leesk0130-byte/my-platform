/**
 * 모든 HTML 페이지의 헤더/푸터/드로어를 통일하는 스크립트
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// New unified header (relative paths adjusted per file)
function makeHeader(activeNav, depth) {
  const p = depth > 0 ? '../'.repeat(depth) : '';
  const active = (name) => name === activeNav ? ' class="active"' : '';
  return `  <header>
    <div class="site-logo"><a href="${p}index.html">가맹점숲</a></div>
    <button type="button" class="nav-toggle" aria-label="메뉴 열기" aria-expanded="false" data-toggle-nav><span></span><span></span><span></span></button>
    <nav class="header-nav" id="headerNav" aria-label="메인 메뉴">
      <a href="${p}pg.html"${active('pg')}>PG 수수료</a>
      <a href="/calculator"${active('calc')}>수수료 계산기</a>
      <a href="${p}news.html"${active('news')}>쇼핑몰 뉴스</a>
      <a href="${p}must-know.html"${active('must')}>필수 가이드</a>
    </nav>
    <div class="header-auth" id="headerAuth"><div id="auth-actions"></div></div>
  </header>`;
}

function makeFooter(depth) {
  const p = depth > 0 ? '../'.repeat(depth) : '';
  return `  <footer>
    <div class="footer-inner">
      <div>
        <p class="footer-title">가맹점숲</p>
        <p>온라인 가맹점주를 위한 PG 수수료 정보, 계산기, 실무 가이드를 제공합니다.</p>
      </div>
      <div>
        <p class="footer-title">바로가기</p>
        <div class="footer-links">
          <a href="${p}about.html">가맹점숲이란?</a>
          <a href="${p}pg.html">PG 수수료 비교</a>
          <a href="/calculator">수수료 계산기</a>
          <a href="${p}news.html">쇼핑몰 뉴스</a>
        </div>
      </div>
      <div class="footer-contact">
        <p class="footer-title">문의</p>
        <p><a href="${p}contact.html">문의하기</a></p>
        <p class="footer-hours">평일 09:00-18:00</p>
        <div class="footer-links" style="margin-top:12px"><a href="${p}terms.html">이용약관</a><a href="${p}privacy.html">개인정보처리방침</a></div>
      </div>
      <p class="footer-copy">&copy; 2025 가맹점숲. All rights reserved.</p>
    </div>
  </footer>`;
}

function makeDrawer(activeNav, depth) {
  const p = depth > 0 ? '../'.repeat(depth) : '';
  const active = (name) => name === activeNav ? ' active' : '';
  return `  <div id="drawerOverlay" hidden aria-hidden="true"></div>
  <aside id="mobileDrawer" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="메뉴">
    <div class="drawer-header">
      <span class="drawer-logo">가맹점숲</span>
      <button type="button" class="drawer-close" aria-label="메뉴 닫기"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4L16 16M16 4L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    </div>
    <nav class="drawer-nav" aria-label="모바일 메뉴">
      <a href="${p}pg.html" class="drawer-link${active('pg')}">PG 수수료</a>
      <a href="/calculator" class="drawer-link${active('calc')}">수수료 계산기</a>
      <a href="${p}news.html" class="drawer-link${active('news')}">쇼핑몰 뉴스</a>
      <a href="${p}must-know.html" class="drawer-link${active('must')}">필수 가이드</a>
      <a href="${p}contact.html" class="drawer-link${active('contact')}">문의하기</a>
    </nav>
    <div id="drawerAuth"></div>
  </aside>`;
}

// Process a file: replace header, footer, drawer
function processFile(filePath, activeNav) {
  let html = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);
  const depth = relPath.split(path.sep).length - 1;
  const drawerScript = depth > 0 ? `<script src="${'../'.repeat(depth)}js/drawer.js"></script>` : '<script src="js/drawer.js"></script>';

  // Remove old header-search form
  html = html.replace(/<form class="header-search"[\s\S]*?<\/form>\s*/g, '');

  // Replace header
  html = html.replace(/<header>[\s\S]*?<\/header>/, makeHeader(activeNav, depth));

  // Replace footer
  html = html.replace(/<footer>[\s\S]*?<\/footer>/, makeFooter(depth));

  // Remove old drawer + overlay and re-add
  html = html.replace(/<div id="drawerOverlay"[\s\S]*?<\/aside>\s*/g, '');
  // Remove old drawer script tag if exists
  html = html.replace(/<script src="[^"]*drawer\.js"><\/script>\s*/g, '');

  // Add drawer before </body>
  html = html.replace('</body>', `\n${makeDrawer(activeNav, depth)}\n  ${drawerScript}\n</body>`);

  // Remove IE compat meta
  html = html.replace(/\s*<meta http-equiv="X-UA-Compatible"[^>]*>/g, '');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Updated: ${relPath}`);
}

// Files to process
const files = [
  { file: 'pg.html', nav: 'pg' },
  { file: 'about.html', nav: '' },
  { file: 'contact.html', nav: 'contact' },
  { file: 'must-know.html', nav: 'must' },
  { file: 'article.html', nav: '' },
  { file: 'guides/index.html', nav: '' },
  { file: 'guides/pg-fee-comparison.html', nav: '' },
  { file: 'guides/easy-pay-fees.html', nav: '' },
  { file: 'guides/payment-methods-compare.html', nav: '' },
  { file: 'guides/pg-integration-hosting.html', nav: '' },
  { file: 'guides/refund-policy.html', nav: '' },
  { file: 'guides/chargeback-response.html', nav: '' },
  { file: 'guides/settlement-cycle-explained.html', nav: '' },
  { file: 'guides/tax-receipt-invoice.html', nav: '' },
  { file: 'guides/virtual-account-ops.html', nav: '' },
  { file: 'must-know/refund.html', nav: 'must' },
  { file: 'must-know/settlement-delay.html', nav: 'must' },
  { file: 'must-know/review.html', nav: 'must' },
  { file: 'must-know/chargeback.html', nav: 'must' },
  { file: 'must-know/settlement-hold.html', nav: 'must' },
  { file: 'must-know/tax-invoice.html', nav: 'must' },
  { file: 'must-know/cash-receipt.html', nav: 'must' },
  { file: 'must-know/virtual-account.html', nav: 'must' },
];

for (const { file, nav } of files) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    try {
      processFile(fullPath, nav);
    } catch (e) {
      console.error(`Error processing ${file}: ${e.message}`);
    }
  } else {
    console.log(`Skipped (not found): ${file}`);
  }
}

console.log('\nDone! All pages unified.');
