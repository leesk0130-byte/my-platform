/* 가맹점숲 홈 렌더러 — /js/home.js
 * 4개 피드 병렬 로드 (popular/news/guides/must-know), 5초 타임아웃, 재시도 없음.
 * XSS 방지: textContent / setAttribute 만 사용. innerHTML 로 사용자 입력 삽입 금지.
 */
(function () {
  'use strict';

  var API = '/api/posts';
  var TIMEOUT_MS = 5000;

  function fetchJson(url) {
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
    var opts = ctl ? { signal: ctl.signal, headers: { 'Accept': 'application/json' } } : {};
    return fetch(url, opts).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).catch(function (e) { clearTimeout(t); throw e; });
  }

  function formatDate(s) {
    if (!s) return '';
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    // KST 기준 YYYY.MM.DD
    var kst = new Date(d.getTime() + (9 * 60 - d.getTimezoneOffset()) * 60000);
    var y = kst.getUTCFullYear();
    var m = String(kst.getUTCMonth() + 1).padStart(2, '0');
    var day = String(kst.getUTCDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function formatViews(v) {
    v = Number(v) || 0;
    if (v >= 10000) return (Math.floor(v / 100) / 100).toFixed(2).replace(/\.?0+$/, '') + '만';
    if (v >= 1000) return (Math.floor(v / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(v);
  }

  function postHref(post) {
    return '/post.html?slug=' + encodeURIComponent(post.slug || ('id-' + post.id));
  }

  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function renderCard(post) {
    var a = el('a', 'card post-card');
    a.setAttribute('href', postHref(post));

    var thumb = el('div', 'post-thumb');
    // 제목 기반 해시로 그라디언트 플레이스홀더 각도 다르게
    var hash = 0, title = String(post.title || '');
    for (var i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
    var ang = Math.abs(hash % 360);
    thumb.setAttribute('style', 'background:linear-gradient(' + ang + 'deg,var(--primary),var(--accent));');
    if (post.cover_image) {
      thumb.setAttribute('style', '');
      var img = el('img');
      img.setAttribute('src', post.cover_image);
      img.setAttribute('alt', '');
      img.setAttribute('loading', 'lazy');
      thumb.appendChild(img);
    }
    a.appendChild(thumb);

    var body = el('div', 'post-body');
    if (post.category) {
      var chip = el('span', 'chip');
      chip.textContent = post.category;
      body.appendChild(chip);
    }
    var h3 = el('h3', 'post-title');
    h3.textContent = post.title || '(제목 없음)';
    body.appendChild(h3);

    if (post.excerpt) {
      var p = el('p', 'post-excerpt');
      p.textContent = post.excerpt;
      body.appendChild(p);
    }

    var meta = el('div', 'post-meta');
    var date = el('span', 'post-date');
    date.textContent = formatDate(post.published_at || post.created_at);
    meta.appendChild(date);
    var views = el('span', 'post-views');
    views.textContent = '조회 ' + formatViews(post.views);
    meta.appendChild(views);
    body.appendChild(meta);

    a.appendChild(body);
    return a;
  }

  function renderListItem(post) {
    var a = el('a', 'list-item');
    a.setAttribute('href', postHref(post));

    var left = el('div', 'li-left');
    if (post.category) {
      var chip = el('span', 'chip');
      chip.textContent = post.category;
      left.appendChild(chip);
    }
    var title = el('span', 'li-title');
    title.textContent = post.title || '(제목 없음)';
    left.appendChild(title);
    a.appendChild(left);

    var right = el('div', 'li-right');
    var date = el('span', 'li-date');
    date.textContent = formatDate(post.published_at || post.created_at);
    right.appendChild(date);
    var views = el('span', 'li-views');
    views.textContent = formatViews(post.views);
    right.appendChild(views);
    a.appendChild(right);

    return a;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function renderEmpty(node, msg) {
    clear(node);
    var d = el('div', 'empty-state');
    d.textContent = msg || '아직 글이 없습니다.';
    node.appendChild(d);
  }

  function renderError(node, msg) {
    clear(node);
    var d = el('div', 'error-state');
    d.textContent = msg || '불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    node.appendChild(d);
  }

  function renderInto(node, items, type) {
    if (!items || !items.length) { renderEmpty(node); return; }
    clear(node);
    for (var i = 0; i < items.length; i++) {
      node.appendChild(type === 'list' ? renderListItem(items[i]) : renderCard(items[i]));
    }
  }

  function loadSection(id, url, kind) {
    var node = document.getElementById(id);
    if (!node) return Promise.resolve();
    return fetchJson(url).then(function (data) {
      var items = (data && Array.isArray(data.items)) ? data.items : [];
      renderInto(node, items, kind);
    }).catch(function () {
      renderError(node);
    });
  }

  function initSearch() {
    var form = document.getElementById('home-search');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('home-search-input');
      var v = (input && input.value || '').trim();
      location.href = '/guides.html?q=' + encodeURIComponent(v);
    });
  }

  function boot() {
    initSearch();
    Promise.all([
      loadSection('sec-popular',  API + '?sort=views_desc&limit=6', 'card'),
      loadSection('sec-news',     API + '?type=news&limit=8', 'list'),
      loadSection('sec-guides',   API + '?type=guide&limit=6&sort=pinned_first', 'card'),
      loadSection('sec-must-know',API + '?type=must-know&limit=8', 'card')
    ]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
