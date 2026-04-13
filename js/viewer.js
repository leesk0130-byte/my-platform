// /js/viewer.js — 공통 글 뷰어 (post.html)
(function () {
  'use strict';

  var TYPE_LABEL = {
    news: '쇼핑몰 뉴스',
    guide: '가이드',
    'must-know': '필수 가이드',
    article: '아티클'
  };
  var TYPE_LIST_URL = {
    news: '/news.html',
    guide: '/guides.html',
    'must-know': '/must-know.html',
    article: '/news.html'
  };

  function $(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso.replace(' ', 'T') + (iso.indexOf('Z') === -1 && iso.indexOf('T') === -1 ? '' : ''));
    if (isNaN(d.getTime())) {
      // Try plain parse fallback
      d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
    }
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  function setCanonical(slug) {
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = 'https://bizimshop.co.kr/post.html?slug=' + encodeURIComponent(slug);
  }

  function setMetaDescription(text) {
    if (!text) return;
    var m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'description';
      document.head.appendChild(m);
    }
    m.content = text.slice(0, 160);
  }

  function renderBreadcrumb(post) {
    var nav = $('post-breadcrumb');
    if (!nav) return;
    var typeLabel = TYPE_LABEL[post.type] || '글';
    var listUrl = TYPE_LIST_URL[post.type] || '/';
    nav.innerHTML = '';
    var home = document.createElement('a'); home.href = '/'; home.textContent = '홈';
    var sep1 = document.createElement('span'); sep1.className = 'sep'; sep1.textContent = '›';
    var typeA = document.createElement('a'); typeA.href = listUrl; typeA.textContent = typeLabel;
    var sep2 = document.createElement('span'); sep2.className = 'sep'; sep2.textContent = '›';
    var cur = document.createElement('span'); cur.textContent = post.title;
    nav.append(home, sep1, typeA, sep2, cur);
  }

  function renderMeta(post) {
    var wrap = $('post-meta');
    wrap.innerHTML = '';
    if (post.category) {
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = post.category;
      wrap.appendChild(chip);
    }
    var dateStr = fmtDate(post.published_at || post.created_at);
    if (dateStr) {
      var dt = document.createElement('span');
      dt.textContent = dateStr;
      wrap.appendChild(dt);
    }
    if (typeof post.views === 'number') {
      var v = document.createElement('span');
      v.textContent = '조회 ' + post.views.toLocaleString();
      wrap.appendChild(v);
    }
  }

  function renderTags(post) {
    var wrap = $('post-tags');
    wrap.innerHTML = '';
    if (!post.tags) return;
    var arr = String(post.tags).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    arr.forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = '#' + t;
      wrap.appendChild(chip);
    });
  }

  function renderCover(post) {
    var img = $('post-cover');
    if (post.cover_image) {
      img.src = post.cover_image;
      img.alt = post.title || '';
      img.hidden = false;
    } else {
      img.hidden = true;
    }
  }

  function showError() {
    $('post-loading').hidden = true;
    $('post-content').hidden = true;
    $('post-error').hidden = false;
    $('post-root').setAttribute('aria-busy', 'false');
    document.title = '글을 찾을 수 없습니다 | 가맹점숲';
  }

  function showContent() {
    $('post-loading').hidden = true;
    $('post-error').hidden = true;
    $('post-content').hidden = false;
    $('post-root').setAttribute('aria-busy', 'false');
  }

  function renderRelated(post) {
    var url = '/api/posts?type=' + encodeURIComponent(post.type) +
              (post.category ? '&category=' + encodeURIComponent(post.category) : '') +
              '&limit=5';
    fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !Array.isArray(data.items)) return;
      var items = data.items.filter(function (p) { return p.slug !== post.slug; }).slice(0, 4);
      if (!items.length) return;
      var grid = $('related-grid');
      grid.innerHTML = '';
      items.forEach(function (p) {
        var a = document.createElement('a');
        a.className = 'card list-item';
        a.href = '/post.html?slug=' + encodeURIComponent(p.slug);
        var h = document.createElement('h3');
        h.textContent = p.title;
        a.appendChild(h);
        if (p.excerpt) {
          var ex = document.createElement('p');
          ex.textContent = p.excerpt;
          ex.style.color = 'var(--muted)';
          ex.style.fontSize = '14px';
          a.appendChild(ex);
        }
        var meta = document.createElement('div');
        meta.className = 'post-meta';
        if (p.category) {
          var c = document.createElement('span'); c.className = 'chip'; c.textContent = p.category;
          meta.appendChild(c);
        }
        var d = document.createElement('span'); d.textContent = fmtDate(p.published_at || p.created_at);
        meta.appendChild(d);
        a.appendChild(meta);
        grid.appendChild(a);
      });
      $('related-root').hidden = false;
    }).catch(function () { /* ignore */ });
  }

  function render(post) {
    document.title = post.title + ' | 가맹점숲';
    setMetaDescription(post.excerpt || post.title);
    setCanonical(post.slug);

    document.body.dataset.postType = post.type || '';
    if (post.published_at) document.body.dataset.postPublished = post.published_at;
    if (post.category) document.body.dataset.postCategory = post.category;
    if (post.title) document.body.dataset.postTitle = post.title;

    $('post-title').textContent = post.title;
    renderMeta(post);
    renderCover(post);
    $('post-body').innerHTML = post.content_html || '';
    renderTags(post);
    renderBreadcrumb(post);
    showContent();
    renderRelated(post);

    try {
      document.dispatchEvent(new CustomEvent('gmj:post-loaded', { detail: post }));
    } catch (e) { /* ignore */ }
  }

  function load() {
    var params = new URLSearchParams(location.search);
    var slug = params.get('slug');
    if (!slug) { showError(); return; }

    fetch('/api/posts/' + encodeURIComponent(slug), { headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (post) {
        if (!post) { showError(); return; }
        // API might return {item: {...}} or the post directly
        var data = post.item || post.post || post;
        if (!data || !data.title) { showError(); return; }
        render(data);
      })
      .catch(function (err) {
        console.error('[viewer] load failed', err);
        showError();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
