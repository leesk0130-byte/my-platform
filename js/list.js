/**
 * list.js — 공통 리스트 페이지 컨트롤러 (news / guide / must-know)
 * 사용법: window.GMJList.init({ type, categories, perPage, defaultSort })
 * - 의존: /api/posts?type=&category=&q=&limit=&offset=&sort=
 * - 디자인 시스템: .card / .chip / .btn / .list-item / .section (styles/components.css)
 */
(function () {
  'use strict';

  var API = '/api/posts';
  var DEFAULT_CATEGORIES = ['전체'];

  var SORT_LABELS = {
    'published_at_desc': '최신순',
    'views_desc': '조회순',
    'pinned_first': '인기순'
  };

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') { /* intentionally unsupported — XSS 방지 */ }
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2), attrs[k]);
        } else if (attrs[k] !== null && attrs[k] !== undefined) {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function formatViews(n) {
    n = Number(n || 0);
    if (n >= 10000) return (Math.floor(n / 1000) / 10).toFixed(1) + 'k';
    return String(n);
  }

  function parseQuery() {
    var p = new URLSearchParams(window.location.search);
    return {
      q: (p.get('q') || '').trim(),
      category: (p.get('category') || '').trim(),
      page: Math.max(1, parseInt(p.get('page') || '1', 10) || 1),
      sort: p.get('sort') || ''
    };
  }

  function writeQuery(state) {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.category) p.set('category', state.category);
    if (state.page > 1) p.set('page', String(state.page));
    if (state.sort && state.sort !== state.defaultSort) p.set('sort', state.sort);
    var qsStr = p.toString();
    var url = window.location.pathname + (qsStr ? '?' + qsStr : '');
    window.history.pushState(state, '', url);
  }

  function buildControls(config, state, onChange) {
    var wrap = el('div', { class: 'list-controls' });

    // 검색바
    var form = el('form', { class: 'search-bar', role: 'search' });
    var input = el('input', {
      type: 'search',
      name: 'q',
      placeholder: '제목/내용 검색',
      value: state.q,
      'aria-label': '검색어',
      class: 'input'
    });
    var btn = el('button', { type: 'submit', class: 'btn btn-primary' }, '검색');
    form.appendChild(input);
    form.appendChild(btn);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = input.value.trim();
      state.page = 1;
      onChange();
    });

    // 카테고리 탭
    var tabs = el('div', { class: 'tabs', role: 'tablist', 'aria-label': '카테고리' });
    (config.categories || DEFAULT_CATEGORIES).forEach(function (cat) {
      var isAll = cat === '전체';
      var active = (isAll && !state.category) || (!isAll && state.category === cat);
      var t = el('button', {
        type: 'button',
        class: 'chip' + (active ? ' chip-active' : ''),
        'aria-pressed': active ? 'true' : 'false'
      }, cat);
      t.addEventListener('click', function () {
        state.category = isAll ? '' : cat;
        state.page = 1;
        onChange();
      });
      tabs.appendChild(t);
    });

    // 정렬
    var sortWrap = el('div', { class: 'sort-wrap' });
    var sortLabel = el('label', { class: 'muted', for: 'list-sort' }, '정렬');
    var sel = el('select', { id: 'list-sort', class: 'select' });
    Object.keys(SORT_LABELS).forEach(function (k) {
      var opt = el('option', { value: k }, SORT_LABELS[k]);
      if (k === state.sort) opt.setAttribute('selected', 'selected');
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      state.sort = sel.value;
      state.page = 1;
      onChange();
    });
    sortWrap.appendChild(sortLabel);
    sortWrap.appendChild(sel);

    wrap.appendChild(form);
    wrap.appendChild(tabs);
    wrap.appendChild(sortWrap);
    return wrap;
  }

  function buildSkeleton() {
    var c = el('div', { class: 'skeleton-list' });
    for (var i = 0; i < 6; i++) {
      var row = el('div', { class: 'skeleton skeleton-row' });
      c.appendChild(row);
    }
    return c;
  }

  function buildEmpty(onReset) {
    var wrap = el('div', { class: 'empty-state' });
    wrap.appendChild(el('p', { class: 'empty-state-title' }, '조건에 맞는 글이 없습니다'));
    wrap.appendChild(el('p', { class: 'empty-state-desc muted' }, '검색어나 카테고리를 바꿔보세요.'));
    var btn = el('button', { type: 'button', class: 'btn btn-outline' }, '검색 초기화');
    btn.addEventListener('click', onReset);
    wrap.appendChild(btn);
    return wrap;
  }

  function buildListItem(item) {
    var row = el('article', { class: 'list-item' });

    // 제목 (링크)
    var a = el('a', {
      class: 'list-item-title',
      href: '/post.html?slug=' + encodeURIComponent(item.slug || '')
    });
    if (Number(item.pinned) === 1) {
      var pin = el('span', { class: 'pin-icon', 'aria-label': '고정' }, '\uD83D\uDCCC');
      a.appendChild(pin);
      a.appendChild(document.createTextNode(' '));
    }
    a.appendChild(document.createTextNode(item.title || '(제목 없음)'));
    row.appendChild(a);

    // 메타 라인
    var meta = el('div', { class: 'list-item-meta' });
    if (item.category) {
      meta.appendChild(el('span', { class: 'chip chip-sm' }, item.category));
    }
    var date = formatDate(item.published_at || item.created_at);
    if (date) meta.appendChild(el('span', { class: 'muted' }, date));
    meta.appendChild(el('span', { class: 'muted' }, '조회 ' + formatViews(item.views)));
    row.appendChild(meta);

    if (item.excerpt) {
      row.appendChild(el('p', { class: 'list-item-excerpt muted' }, item.excerpt));
    }
    return row;
  }

  function buildPagination(total, perPage, current, onPage) {
    var pages = Math.max(1, Math.ceil(total / perPage));
    if (pages <= 1) return el('div');
    var nav = el('nav', { class: 'pagination', 'aria-label': '페이지' });

    function pbtn(label, page, opts) {
      opts = opts || {};
      var b = el('button', {
        type: 'button',
        class: 'page-btn' + (opts.active ? ' page-btn-active' : ''),
        'aria-current': opts.active ? 'page' : null
      }, String(label));
      if (opts.disabled) {
        b.setAttribute('disabled', 'disabled');
      } else {
        b.addEventListener('click', function () { onPage(page); });
      }
      return b;
    }

    nav.appendChild(pbtn('이전', current - 1, { disabled: current <= 1 }));

    var win = 2;
    var start = Math.max(1, current - win);
    var end = Math.min(pages, current + win);
    if (start > 1) {
      nav.appendChild(pbtn(1, 1));
      if (start > 2) nav.appendChild(el('span', { class: 'page-dots muted' }, '…'));
    }
    for (var i = start; i <= end; i++) {
      nav.appendChild(pbtn(i, i, { active: i === current }));
    }
    if (end < pages) {
      if (end < pages - 1) nav.appendChild(el('span', { class: 'page-dots muted' }, '…'));
      nav.appendChild(pbtn(pages, pages));
    }

    nav.appendChild(pbtn('다음', current + 1, { disabled: current >= pages }));
    return nav;
  }

  function init(config) {
    var root = qs('#list-root');
    var controls = qs('#list-controls');
    if (!root) return;

    var defaultSort = config.defaultSort ||
      (config.type === 'news' ? 'published_at_desc' : 'pinned_first');
    var perPage = config.perPage || 20;

    var parsed = parseQuery();
    var state = {
      q: parsed.q,
      category: parsed.category,
      page: parsed.page,
      sort: parsed.sort || defaultSort,
      defaultSort: defaultSort
    };

    var controlsEl;

    function render() {
      // Controls
      if (controls) {
        var newControls = buildControls(config, state, function () {
          writeQuery(state);
          render();
        });
        controls.innerHTML = '';
        controls.appendChild(newControls);
      }

      // Loading
      root.innerHTML = '';
      root.appendChild(buildSkeleton());

      var params = new URLSearchParams();
      params.set('type', config.type);
      if (state.category) params.set('category', state.category);
      if (state.q) params.set('q', state.q);
      params.set('limit', String(perPage));
      params.set('offset', String((state.page - 1) * perPage));
      params.set('sort', state.sort);

      fetch(API + '?' + params.toString(), { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('api_fail_' + res.status);
          return res.json();
        })
        .then(function (data) {
          var items = (data && data.items) || [];
          var total = Number((data && data.total) || 0);

          root.innerHTML = '';
          if (!items.length) {
            root.appendChild(buildEmpty(function () {
              state.q = '';
              state.category = '';
              state.page = 1;
              state.sort = defaultSort;
              writeQuery(state);
              render();
            }));
            return;
          }

          var card = el('div', { class: 'card list-card' });
          var list = el('div', { class: 'list-stack', role: 'list' });
          items.forEach(function (it) { list.appendChild(buildListItem(it)); });
          card.appendChild(list);
          root.appendChild(card);

          root.appendChild(buildPagination(total, perPage, state.page, function (p) {
            state.page = p;
            writeQuery(state);
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }));
        })
        .catch(function () {
          root.innerHTML = '';
          var err = el('div', { class: 'empty-state' });
          err.appendChild(el('p', { class: 'empty-state-title' }, '목록을 불러오지 못했어요'));
          err.appendChild(el('p', { class: 'empty-state-desc muted' }, '잠시 후 다시 시도해 주세요.'));
          var retry = el('button', { type: 'button', class: 'btn btn-outline' }, '다시 시도');
          retry.addEventListener('click', render);
          err.appendChild(retry);
          root.appendChild(err);
        });
    }

    window.addEventListener('popstate', function () {
      var p = parseQuery();
      state.q = p.q;
      state.category = p.category;
      state.page = p.page;
      state.sort = p.sort || defaultSort;
      render();
    });

    render();
  }

  window.GMJList = { init: init };
})();
