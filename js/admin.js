/* js/admin.js — 가맹점숲 어드민 SPA
   스펙: _REMODEL_SPEC.md (Agent 5)
   의존: Quill 1.3.6 CDN, layout.js, theme.js, /api/admin/*, /api/posts, /api/upload
*/
(function () {
  'use strict';

  // ===== State =====
  var state = {
    view: 'login',           // 'login' | 'dashboard' | 'editor'
    authed: false,
    list: [],
    total: 0,
    limit: 20,
    offset: 0,
    filterType: '',
    filterQ: '',
    editingId: null,         // null = new
    quill: null,
    searchDebounce: null
  };

  var PAGE_SIZE = 20;

  // ===== Utilities =====
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function showToast(msg, type) {
    var region = $('#toast-region');
    if (!region) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
    el.textContent = msg;
    region.appendChild(el);
    setTimeout(function () {
      el.classList.add('leaving');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, 2800);
  }

  function api(path, opts) {
    opts = opts || {};
    var init = {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: Object.assign({ 'Accept': 'application/json' }, opts.headers || {})
    };
    if (opts.body !== undefined) {
      if (opts.body instanceof FormData) {
        init.body = opts.body;
      } else {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(opts.body);
      }
    }
    return fetch(path, init).then(function (res) {
      var ct = res.headers.get('content-type') || '';
      var p = ct.indexOf('application/json') !== -1 ? res.json() : res.text();
      return p.then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.error) || ('HTTP ' + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function fmtDate(s) {
    if (!s) return '-';
    try {
      var d = new Date(s.indexOf('T') === -1 ? s.replace(' ', 'T') + 'Z' : s);
      if (isNaN(d.getTime())) return s;
      var y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
      return y + '-' + m + '-' + day + ' ' + hh + ':' + mm;
    } catch (e) { return s; }
  }

  function typeLabel(t) {
    return { news: '뉴스', guide: '가이드', 'must-know': '필수', article: '아티클' }[t] || t || '-';
  }

  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\w\s가-힣-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  // ===== View routing =====
  function setView(v) {
    state.view = v;
    $('#admin-login').classList.toggle('admin-hidden', v !== 'login');
    $('#admin-dashboard').classList.toggle('admin-hidden', v !== 'dashboard');
    $('#admin-editor').classList.toggle('admin-hidden', v !== 'editor');
  }

  function navigateFromHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!state.authed) { setView('login'); return; }
    if (h === 'new') { openEditor(null); return; }
    var m = /^edit-(\d+)$/.exec(h);
    if (m) { openEditor(parseInt(m[1], 10)); return; }
    // default dashboard
    setView('dashboard');
    loadList();
  }

  // ===== Auth =====
  function checkSession() {
    return api('/api/admin/me').then(function () {
      state.authed = true;
    }).catch(function () {
      state.authed = false;
    });
  }

  function bindLogin() {
    var form = $('#login-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('#login-email').value.trim();
      var password = $('#login-password').value;
      var errEl = $('#login-error');
      errEl.classList.add('admin-hidden');
      if (!email || !password) {
        errEl.textContent = '이메일과 비밀번호를 입력하세요.';
        errEl.classList.remove('admin-hidden');
        return;
      }
      api('/api/admin/login', { method: 'POST', body: { email: email, password: password } })
        .then(function () {
          state.authed = true;
          showToast('로그인 성공', 'success');
          location.hash = 'dashboard';
          if (location.hash === '#dashboard') navigateFromHash();
        })
        .catch(function (err) {
          errEl.textContent = err.status === 401 ? '이메일 또는 비밀번호가 틀렸습니다.' : ('로그인 실패: ' + err.message);
          errEl.classList.remove('admin-hidden');
        });
    });
  }

  function logout() {
    api('/api/admin/logout', { method: 'POST' }).catch(function () {}).then(function () {
      state.authed = false;
      showToast('로그아웃 되었습니다.');
      location.hash = 'login';
      setView('login');
    });
  }

  // ===== List =====
  function loadList() {
    var tbody = $('#admin-table-body');
    var mobile = $('#admin-mobile-list');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">불러오는 중...</td></tr>';
    mobile.innerHTML = '<div class="empty-state">불러오는 중...</div>';

    var qs = new URLSearchParams();
    qs.set('status', 'all');
    qs.set('limit', String(state.limit));
    qs.set('offset', String(state.offset));
    if (state.filterType) qs.set('type', state.filterType);
    if (state.filterQ) qs.set('q', state.filterQ);

    api('/api/posts?' + qs.toString())
      .then(function (data) {
        state.list = (data && data.items) || [];
        state.total = (data && data.total) || 0;
        renderList();
        renderSummary();
      })
      .catch(function (err) {
        showToast('목록 로드 실패: ' + err.message, 'error');
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">로드 실패</td></tr>';
        mobile.innerHTML = '<div class="empty-state">로드 실패</div>';
      });
  }

  function renderSummary() {
    // counts from current page; for total we have state.total
    var published = 0, draft = 0, views = 0;
    state.list.forEach(function (p) {
      if (p.status === 'published') published++;
      else if (p.status === 'draft') draft++;
      views += (p.views || 0);
    });
    $('#sum-total').textContent = state.total;
    $('#sum-published').textContent = published + (state.total > state.list.length ? '+' : '');
    $('#sum-draft').textContent = draft + (state.total > state.list.length ? '+' : '');
    $('#sum-views').textContent = views.toLocaleString() + (state.total > state.list.length ? '+' : '');
  }

  function statusBadge(s) {
    var span = document.createElement('span');
    span.className = 'badge ' + (s === 'published' ? 'badge-ok' : s === 'draft' ? 'badge-warn' : '');
    span.textContent = s === 'published' ? '공개' : s === 'draft' ? '초안' : (s || '-');
    return span;
  }

  function makeActions(p) {
    var wrap = document.createElement('div');
    wrap.className = 'actions';

    var edit = document.createElement('button');
    edit.className = 'btn btn-sm';
    edit.textContent = '수정';
    edit.addEventListener('click', function () { location.hash = 'edit-' + p.id; });

    var pin = document.createElement('button');
    pin.className = 'btn btn-sm' + (p.pinned ? ' pin-on' : '');
    pin.textContent = p.pinned ? '고정 해제' : '고정';
    pin.addEventListener('click', function () {
      api('/api/posts/' + p.id, { method: 'PUT', body: { pinned: p.pinned ? 0 : 1 } })
        .then(function () { showToast('업데이트 완료', 'success'); loadList(); })
        .catch(function (err) { showToast('실패: ' + err.message, 'error'); });
    });

    var del = document.createElement('button');
    del.className = 'btn btn-sm btn-danger';
    del.textContent = '삭제';
    del.addEventListener('click', function () {
      if (!confirm('정말 삭제하시겠습니까?\n\n' + p.title)) return;
      api('/api/posts/' + p.id, { method: 'DELETE' })
        .then(function () { showToast('삭제 완료', 'success'); loadList(); })
        .catch(function (err) { showToast('삭제 실패: ' + err.message, 'error'); });
    });

    wrap.appendChild(edit);
    wrap.appendChild(pin);
    wrap.appendChild(del);
    return wrap;
  }

  function renderList() {
    var tbody = $('#admin-table-body');
    var mobile = $('#admin-mobile-list');
    tbody.innerHTML = '';
    mobile.innerHTML = '';

    if (!state.list.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">글이 없습니다</td></tr>';
      mobile.innerHTML = '<div class="empty-state">글이 없습니다</div>';
      renderPagination();
      return;
    }

    state.list.forEach(function (p) {
      // desktop row
      var tr = document.createElement('tr');

      var tdCheck = document.createElement('td');
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.id = p.id;
      tdCheck.appendChild(cb);

      var tdTitle = document.createElement('td');
      var titleStrong = document.createElement('div');
      titleStrong.style.fontWeight = '500';
      titleStrong.textContent = p.title || '(제목 없음)';
      if (p.pinned) {
        var pinTag = document.createElement('span');
        pinTag.className = 'chip chip-primary';
        pinTag.textContent = '고정';
        pinTag.style.marginLeft = '8px';
        titleStrong.appendChild(pinTag);
      }
      var slug = document.createElement('div');
      slug.style.fontSize = '12px';
      slug.style.color = 'var(--muted)';
      slug.textContent = '/' + (p.slug || '');
      tdTitle.appendChild(titleStrong);
      tdTitle.appendChild(slug);

      var tdType = document.createElement('td');
      tdType.textContent = typeLabel(p.type);

      var tdCat = document.createElement('td');
      tdCat.textContent = p.category || '-';

      var tdStatus = document.createElement('td');
      tdStatus.appendChild(statusBadge(p.status));

      var tdViews = document.createElement('td');
      tdViews.textContent = (p.views || 0).toLocaleString();

      var tdDate = document.createElement('td');
      tdDate.textContent = fmtDate(p.updated_at || p.published_at || p.created_at);

      var tdAct = document.createElement('td');
      tdAct.appendChild(makeActions(p));

      tr.appendChild(tdCheck);
      tr.appendChild(tdTitle);
      tr.appendChild(tdType);
      tr.appendChild(tdCat);
      tr.appendChild(tdStatus);
      tr.appendChild(tdViews);
      tr.appendChild(tdDate);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);

      // mobile item
      var li = document.createElement('div');
      li.className = 'list-item';
      var liTitle = document.createElement('div');
      liTitle.className = 'li-title';
      liTitle.textContent = p.title || '(제목 없음)';
      var liMeta = document.createElement('div');
      liMeta.className = 'li-date';
      liMeta.textContent = typeLabel(p.type) + ' · ' + fmtDate(p.updated_at || p.created_at);
      var liStatus = document.createElement('div');
      liStatus.className = 'li-cat';
      liStatus.appendChild(statusBadge(p.status));

      li.appendChild(liTitle);
      li.appendChild(liStatus);
      li.appendChild(liMeta);
      li.appendChild(makeActions(p));
      mobile.appendChild(li);
    });

    renderPagination();
  }

  function renderPagination() {
    var pg = $('#admin-pagination');
    pg.innerHTML = '';
    var total = state.total || 0;
    var pages = Math.max(1, Math.ceil(total / state.limit));
    var cur = Math.floor(state.offset / state.limit) + 1;
    if (pages <= 1) return;

    function mkBtn(label, page, disabled, active) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (disabled) b.disabled = true;
      if (active) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', function () {
        state.offset = (page - 1) * state.limit;
        loadList();
      });
      return b;
    }

    pg.appendChild(mkBtn('<', cur - 1, cur <= 1, false));
    var start = Math.max(1, cur - 2);
    var end = Math.min(pages, start + 4);
    for (var i = start; i <= end; i++) {
      pg.appendChild(mkBtn(String(i), i, false, i === cur));
    }
    pg.appendChild(mkBtn('>', cur + 1, cur >= pages, false));
  }

  function bindToolbar() {
    $('#btn-new').addEventListener('click', function () { location.hash = 'new'; });
    $('#btn-logout').addEventListener('click', logout);
    $('#filter-type').addEventListener('change', function (e) {
      state.filterType = e.target.value;
      state.offset = 0;
      loadList();
    });
    $('#filter-q').addEventListener('input', function (e) {
      clearTimeout(state.searchDebounce);
      var v = e.target.value.trim();
      state.searchDebounce = setTimeout(function () {
        state.filterQ = v;
        state.offset = 0;
        loadList();
      }, 300);
    });
  }

  // ===== Editor =====
  function ensureQuill() {
    if (state.quill) return state.quill;
    if (typeof Quill === 'undefined') {
      showToast('에디터 로드 실패 (Quill)', 'error');
      return null;
    }
    var q = new Quill('#quill-editor', {
      theme: 'snow',
      placeholder: '본문을 작성하세요...',
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            ['link', 'image'],
            ['clean']
          ]
        }
      }
    });
    // image handler via /api/upload
    var toolbar = q.getModule('toolbar');
    toolbar.addHandler('image', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var fd = new FormData();
        fd.append('file', file);
        api('/api/upload', { method: 'POST', body: fd })
          .then(function (data) {
            var url = data && data.url;
            if (!url) throw new Error('응답에 url 없음');
            var range = q.getSelection(true);
            q.insertEmbed(range.index, 'image', url, 'user');
            q.setSelection(range.index + 1, 0);
          })
          .catch(function (err) { showToast('이미지 업로드 실패: ' + err.message, 'error'); });
      });
      input.click();
    });
    state.quill = q;
    return q;
  }

  function openEditor(id) {
    setView('editor');
    var q = ensureQuill();
    state.editingId = id;
    $('#editor-title').textContent = id ? '글 수정' : '새 글 작성';

    // reset
    $('#editor-form').reset();
    $('#ed-cover-url').value = '';
    var prev = $('#ed-cover-preview');
    prev.classList.add('admin-hidden');
    prev.src = '';
    if (q) q.setContents([]);

    if (!id) return;

    // load post by id — we use list cache first, but fetch fresh to be safe
    var cached = state.list.find(function (p) { return p.id === id; });
    if (cached) fillEditor(cached);

    // fetch fresh by slug (public GET) if cached
    if (cached && cached.slug) {
      api('/api/posts/' + encodeURIComponent(cached.slug))
        .then(function (p) { if (p) fillEditor(p); })
        .catch(function () {});
    }
  }

  function fillEditor(p) {
    $('#ed-title').value = p.title || '';
    $('#ed-type').value = p.type || 'news';
    $('#ed-status').value = p.status || 'published';
    $('#ed-category').value = p.category || '';
    $('#ed-tags').value = p.tags || '';
    $('#ed-slug').value = p.slug || '';
    $('#ed-excerpt').value = p.excerpt || '';
    $('#ed-cover-url').value = p.cover_image || '';
    $('#ed-pinned').checked = !!p.pinned;
    if (p.cover_image) {
      var prev = $('#ed-cover-preview');
      prev.src = p.cover_image;
      prev.classList.remove('admin-hidden');
    }
    if (state.quill && p.content_html) {
      state.quill.clipboard.dangerouslyPasteHTML(p.content_html);
    }
  }

  function bindEditor() {
    $('#btn-editor-cancel').addEventListener('click', function () {
      location.hash = 'dashboard';
    });
    $('#btn-editor-save').addEventListener('click', saveEditor);

    $('#ed-cover-file').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var fd = new FormData();
      fd.append('file', file);
      api('/api/upload', { method: 'POST', body: fd })
        .then(function (data) {
          $('#ed-cover-url').value = data.url;
          var prev = $('#ed-cover-preview');
          prev.src = data.url;
          prev.classList.remove('admin-hidden');
          showToast('커버 이미지 업로드 완료', 'success');
        })
        .catch(function (err) { showToast('업로드 실패: ' + err.message, 'error'); });
    });

    $('#ed-title').addEventListener('blur', function () {
      var slug = $('#ed-slug');
      if (!slug.value.trim()) slug.value = slugify($('#ed-title').value);
    });
  }

  function saveEditor() {
    var title = $('#ed-title').value.trim();
    if (!title) { showToast('제목을 입력하세요', 'error'); return; }
    var q = state.quill;
    var html = q ? q.root.innerHTML : '';
    if (!html || html === '<p><br></p>') { showToast('본문을 입력하세요', 'error'); return; }

    var body = {
      type: $('#ed-type').value,
      slug: $('#ed-slug').value.trim() || slugify(title) || ('post-' + Date.now()),
      title: title,
      category: $('#ed-category').value || null,
      tags: $('#ed-tags').value.trim(),
      excerpt: $('#ed-excerpt').value.trim(),
      content_html: html,
      cover_image: $('#ed-cover-url').value.trim() || null,
      status: $('#ed-status').value,
      pinned: $('#ed-pinned').checked ? 1 : 0
    };

    var req = state.editingId
      ? api('/api/posts/' + state.editingId, { method: 'PUT', body: body })
      : api('/api/posts', { method: 'POST', body: body });

    req.then(function () {
      showToast('저장 완료', 'success');
      location.hash = 'dashboard';
    }).catch(function (err) {
      showToast('저장 실패: ' + err.message, 'error');
    });
  }

  // ===== Init =====
  function init() {
    bindLogin();
    bindToolbar();
    bindEditor();

    window.addEventListener('hashchange', navigateFromHash);

    checkSession().then(function () {
      if (!state.authed) {
        setView('login');
        if (!location.hash || location.hash === '#dashboard' || location.hash.indexOf('#edit') === 0 || location.hash === '#new') {
          // stay on login
        }
        return;
      }
      if (!location.hash) location.hash = 'dashboard';
      navigateFromHash();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
