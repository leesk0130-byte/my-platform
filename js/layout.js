/* js/layout.js — 가맹점숲 공통 레이아웃 주입
   사용법: 페이지에 <div data-gmj-header></div>, <div data-gmj-footer></div> 만 두면 자동 주입.
   placeholder 없으면 body 맨 앞/맨 뒤에 자동 생성.
   의존: js/theme.js (선행 로드 권장) */
(function () {
  'use strict';

  var NAV_ITEMS = [
    { href: '/',               label: '홈' },
    { href: '/calculator.html', label: '계산기' },
    { href: '/pg.html',        label: 'PG 비교' },
    { href: '/news.html',      label: '뉴스' },
    { href: '/guides.html',    label: '가이드' },
    { href: '/must-know.html', label: '필수가이드' }
  ];

  var ADMIN_ITEM = { href: '/admin.html', label: '관리자' };

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normalizePath(p) {
    if (!p) return '/';
    // strip query/hash
    p = p.split('?')[0].split('#')[0];
    // treat "/index.html" as "/"
    if (p === '/index.html') return '/';
    // ensure leading slash
    if (p.charAt(0) !== '/') p = '/' + p;
    return p;
  }

  function isActive(itemHref, currentPath) {
    var a = normalizePath(itemHref);
    var c = normalizePath(currentPath);
    if (a === '/') return c === '/';
    // match exact or nested (e.g. /guides.html vs /guides/foo.html)
    if (c === a) return true;
    var base = a.replace(/\.html$/, '');
    if (c.indexOf(base + '/') === 0) return true;
    if (c.indexOf(base + '.') === 0) return true;
    return false;
  }

  /* ---------- icons (inline svg, lucide-style) ---------- */
  var ICON = {
    menu:  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    sun:   '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon:  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    shield:'<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
  };

  /* ---------- markup builders ---------- */
  function buildNavLinks(currentPath, cls) {
    return NAV_ITEMS.map(function (it) {
      var active = isActive(it.href, currentPath) ? ' active' : '';
      return '<a class="' + cls + active + '" href="' + esc(it.href) + '">' + esc(it.label) + '</a>';
    }).join('');
  }

  function buildHeader(currentPath) {
    var adminActive = isActive(ADMIN_ITEM.href, currentPath) ? ' active' : '';
    return ''
      + '<header class="gmj-header" role="banner">'
      +   '<div class="gmj-header-inner">'
      +     '<a class="gmj-logo" href="/" aria-label="가맹점숲 홈">'
      +       '<span class="logo-mark">가</span>'
      +       '<span>가맹점숲</span>'
      +     '</a>'
      +     '<nav class="gmj-nav" aria-label="주요 메뉴">'
      +       buildNavLinks(currentPath, 'gmj-nav-link')
      +     '</nav>'
      +     '<div class="gmj-header-actions">'
      +       '<a class="gmj-nav-link' + adminActive + '" href="' + esc(ADMIN_ITEM.href) + '" data-gmj-admin-link>' + esc(ADMIN_ITEM.label) + '</a>'
      +       '<button type="button" class="gmj-icon-btn" data-gmj-theme-toggle aria-label="테마 전환">' + ICON.sun + '</button>'
      +       '<button type="button" class="gmj-icon-btn gmj-hamburger" data-gmj-drawer-open aria-label="메뉴 열기" aria-expanded="false">' + ICON.menu + '</button>'
      +     '</div>'
      +   '</div>'
      + '</header>';
  }

  function buildDrawer(currentPath) {
    return ''
      + '<div class="gmj-drawer-backdrop" data-gmj-drawer-close hidden></div>'
      + '<aside class="gmj-drawer" role="dialog" aria-label="모바일 메뉴" aria-hidden="true">'
      +   '<div class="gmj-drawer-header">'
      +     '<span class="gmj-logo"><span class="logo-mark">가</span><span>가맹점숲</span></span>'
      +     '<button type="button" class="gmj-icon-btn" data-gmj-drawer-close aria-label="메뉴 닫기">' + ICON.close + '</button>'
      +   '</div>'
      +   '<nav class="gmj-drawer-nav" aria-label="모바일 메뉴">'
      +     buildNavLinks(currentPath, 'gmj-nav-link')
      +     '<a class="gmj-nav-link" href="' + esc(ADMIN_ITEM.href) + '">' + esc(ADMIN_ITEM.label) + '</a>'
      +   '</nav>'
      + '</aside>';
  }

  function buildFooter() {
    var y = new Date().getFullYear();
    return ''
      + '<footer class="gmj-footer" role="contentinfo">'
      +   '<div class="gmj-footer-inner">'
      +     '<div class="gmj-footer-brand">'
      +       '<a class="gmj-logo" href="/"><span class="logo-mark">가</span><span>가맹점숲</span></a>'
      +       '<p class="desc">PG 수수료 비교, 실전 계산기, 현업자가 쓰는 가맹점 운영 가이드. 블라인드스럽고, 오르비처럼 깊이 있게.</p>'
      +       '<p class="gmj-footer-biz">'
      +         '사업자 정보 준비중 · 대표: — · 사업자등록번호: — · 주소: —<br>'
      +         '본 사이트의 정보는 참고용이며, 실제 계약 조건은 각 PG사·가맹점 상황에 따라 달라질 수 있습니다.'
      +       '</p>'
      +     '</div>'
      +     '<ul class="gmj-footer-links">'
      +       '<li><a href="/terms.html">이용약관</a></li>'
      +       '<li><a href="/privacy.html">개인정보처리방침</a></li>'
      +       '<li><a href="/contact.html">문의</a></li>'
      +       '<li><a href="/about.html">소개</a></li>'
      +     '</ul>'
      +   '</div>'
      +   '<div class="gmj-footer-bottom">'
      +     '<span>© ' + y + ' 가맹점숲 (bizimshop.co.kr). All rights reserved.</span>'
      +     '<span>Made with care · v2026.04</span>'
      +   '</div>'
      + '</footer>';
  }

  /* ---------- theme toggle icon sync ---------- */
  function syncThemeIcon() {
    var btn = document.querySelector('[data-gmj-theme-toggle]');
    if (!btn) return;
    var t = (window.GMJTheme && window.GMJTheme.get) ? window.GMJTheme.get()
          : document.documentElement.getAttribute('data-theme') || 'dark';
    btn.innerHTML = (t === 'dark') ? ICON.sun : ICON.moon;
    btn.setAttribute('aria-label', t === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
  }

  /* ---------- drawer controls ---------- */
  function openDrawer() {
    var d = document.querySelector('.gmj-drawer');
    var b = document.querySelector('.gmj-drawer-backdrop');
    var h = document.querySelector('[data-gmj-drawer-open]');
    if (!d || !b) return;
    b.hidden = false;
    // next frame for transition
    requestAnimationFrame(function () {
      d.classList.add('open');
      b.classList.add('open');
    });
    d.setAttribute('aria-hidden', 'false');
    if (h) h.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    var d = document.querySelector('.gmj-drawer');
    var b = document.querySelector('.gmj-drawer-backdrop');
    var h = document.querySelector('[data-gmj-drawer-open]');
    if (!d || !b) return;
    d.classList.remove('open');
    b.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
    if (h) h.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () { if (!b.classList.contains('open')) b.hidden = true; }, 320);
  }

  /* ---------- main mount ---------- */
  function mount() {
    var currentPath = window.location.pathname;

    // header placeholder
    var headerHost = document.querySelector('[data-gmj-header]');
    if (!headerHost) {
      headerHost = document.createElement('div');
      headerHost.setAttribute('data-gmj-header', '');
      document.body.insertBefore(headerHost, document.body.firstChild);
    }
    headerHost.innerHTML = buildHeader(currentPath) + buildDrawer(currentPath);

    // footer placeholder
    var footerHost = document.querySelector('[data-gmj-footer]');
    if (!footerHost) {
      footerHost = document.createElement('div');
      footerHost.setAttribute('data-gmj-footer', '');
      document.body.appendChild(footerHost);
    }
    footerHost.innerHTML = buildFooter();

    // bindings
    var tbtn = headerHost.querySelector('[data-gmj-theme-toggle]');
    if (tbtn) {
      tbtn.addEventListener('click', function () {
        if (window.GMJTheme && window.GMJTheme.toggle) window.GMJTheme.toggle();
      });
    }
    syncThemeIcon();
    document.addEventListener('gmj:themechange', syncThemeIcon);

    var hambtn = headerHost.querySelector('[data-gmj-drawer-open]');
    if (hambtn) hambtn.addEventListener('click', openDrawer);

    headerHost.querySelectorAll('[data-gmj-drawer-close]').forEach(function (el) {
      el.addEventListener('click', closeDrawer);
    });

    // close drawer on nav click (mobile)
    headerHost.querySelectorAll('.gmj-drawer .gmj-nav-link').forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });

    // ESC closes drawer
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
