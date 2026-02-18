(function () {
  'use strict';
  var overlay = null, drawer = null, triggerBtn = null;

  function createDOM() {
    if (document.getElementById('mobileDrawer')) return;
    var path = (window.location.pathname + window.location.search).toLowerCase();
    function active(href) {
      return path.indexOf(href.replace('.html', '')) !== -1 ? ' active' : '';
    }
    var ol = document.createElement('div');
    ol.id = 'drawerOverlay';
    ol.setAttribute('hidden', '');
    ol.setAttribute('aria-hidden', 'true');
    var dr = document.createElement('aside');
    dr.id = 'mobileDrawer';
    dr.setAttribute('hidden', '');
    dr.setAttribute('aria-hidden', 'true');
    dr.setAttribute('role', 'dialog');
    dr.setAttribute('aria-modal', 'true');
    dr.setAttribute('aria-label', '메뉴');
    dr.innerHTML =
      '<div class="drawer-header">' +
        '<span class="drawer-logo">가맹점숲</span>' +
        '<button type="button" class="drawer-close" aria-label="메뉴 닫기">' +
          '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
            '<path d="M4 4L16 16M16 4L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<nav class="drawer-nav" aria-label="모바일 메뉴">' +
        '<a href="community.html" class="drawer-link' + active('community') + '">커뮤니티</a>' +
        '<a href="pg.html" class="drawer-link' + active('pg') + '">PG 수수료 표</a>' +
        '<a href="calculator.html" class="drawer-link' + active('calculator') + '">수수료 계산기</a>' +
        '<a href="news.html" class="drawer-link' + active('news') + '">뉴스</a>' +
        '<a href="verify.html" class="drawer-link' + active('verify') + '">인증/문의</a>' +
      '</nav>';
    document.body.appendChild(ol);
    document.body.appendChild(dr);
  }

  function init() {
    createDOM();
    overlay = document.getElementById('drawerOverlay');
    drawer  = document.getElementById('mobileDrawer');
    if (!overlay || !drawer) return;
    var closeBtn = drawer.querySelector('.drawer-close');
    overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) closeDrawer();
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var all = Array.prototype.slice.call(
        drawer.querySelectorAll('a[href], button:not([disabled])')
      );
      if (!all.length) return;
      var first = all[0], last = all[all.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    });
  }

  function openDrawer() {
    triggerBtn = document.querySelector('[data-toggle-nav]');
    if (!overlay || !drawer) return;
    overlay.removeAttribute('hidden');
    drawer.removeAttribute('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('open');
        drawer.classList.add('open');
      });
    });
    document.body.classList.add('no-scroll');
    drawer.setAttribute('aria-hidden', 'false');
    if (triggerBtn) {
      triggerBtn.setAttribute('aria-expanded', 'true');
      triggerBtn.setAttribute('aria-label', '메뉴 닫기');
    }
    setTimeout(function () {
      var first = drawer.querySelector('.drawer-nav a, .drawer-close');
      if (first) first.focus();
    }, 80);
  }

  function closeDrawer() {
    if (!overlay || !drawer) return;
    if (!drawer.classList.contains('open')) return;
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.classList.remove('no-scroll');
    drawer.setAttribute('aria-hidden', 'true');
    if (triggerBtn) {
      triggerBtn.setAttribute('aria-expanded', 'false');
      triggerBtn.setAttribute('aria-label', '메뉴 열기');
      triggerBtn.focus();
    }
    var fallback = setTimeout(doHide, 400);
    function onEnd(e) {
      if (e.propertyName !== 'transform') return;
      clearTimeout(fallback);
      doHide();
      drawer.removeEventListener('transitionend', onEnd);
    }
    drawer.addEventListener('transitionend', onEnd);
    function doHide() {
      drawer.setAttribute('hidden', '');
      overlay.setAttribute('hidden', '');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.openDrawer  = openDrawer;
  window.closeDrawer = closeDrawer;
}());
