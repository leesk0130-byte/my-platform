/**
 * 뉴스 페이지: API만 사용. 리스트/상세, Skeleton/Empty/Error 분리.
 */
(function () {
  'use strict';

  var BASE = typeof window.apiUrl === 'function' ? window.apiUrl : function (path) {
    var b = (window.API_BASE_URL || '').replace(/\/$/, '');
    var p = (path || '').replace(/^\//, '');
    return b ? b + '/' + p : '/' + p;
  };

  function getQueryId() {
    var m = /[?&]id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function showSkeleton(root) {
    root.innerHTML = '<div class="skeleton-news"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:60%"></div></div>';
  }

  function showError(root, message) {
    root.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state-title">뉴스 준비 중입니다</p>' +
        '<p class="empty-state-desc">곧 운영자가 최신 뉴스를 등록할 예정입니다. 잠시 후 다시 확인해 주세요.</p>' +
        '<a href="index.html" class="btn btn-outline btn-sm" style="margin-top:12px;">홈으로</a>' +
      '</div>';
  }

  function showEmpty(root) {
    root.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state-title">등록된 뉴스가 없습니다</p>' +
        '<p class="empty-state-desc">관리자 로그인 후 상단의 <strong>뉴스 10개 자동 채우기</strong>로 등록하거나, <strong>+ 뉴스 작성</strong>으로 직접 올릴 수 있습니다.</p>' +
        '<a href="index.html" class="btn btn-outline btn-sm" style="margin-top:12px;">홈으로</a>' +
      '</div>';
  }

  function renderList(items, root) {
    if (!items || items.length === 0) {
      showEmpty(root);
      return;
    }
    var html = '<ul class="news-list">' + items.map(function (n) {
      var link = 'news.html?id=' + (n.id || '');
      var badge = (n.category || n.badge) ? '<span class="news-badge">' + (n.category || n.badge) + '</span>' : '';
      var date = n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
      return '<li class="news-item"><a href="' + link + '"><span class="news-title">' + (n.title || '') + '</span>' + badge + '<div class="news-meta">' + date + ' · 가맹점숲</div></a></li>';
    }).join('') + '</ul>';
    root.innerHTML = html;
  }

  function renderDetail(item, root) {
    var date = item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
    var category = (item.category || item.badge) ? '<span class="news-badge">' + (item.category || item.badge) + '</span>' : '';
    var body = (item.content || item.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    root.innerHTML =
      '<div class="news-detail">' +
        '<h1 class="news-detail-title">' + (item.title || '') + '</h1>' +
        '<div class="news-detail-meta">' + category + ' ' + date + ' · 가맹점숲</div>' +
        '<div class="news-detail-body">' + body + '</div>' +
      '</div>';
  }

  function loadList(root) {
    showSkeleton(root);
    fetch(BASE('api/news') + '?limit=50&offset=0')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error(res.statusText || 'Network error')); })
      .then(function (data) {
        var items = data.items || data || [];
        if (!items || !items.length) {
          showEmpty(root);
          return;
        }
        renderList(items, root);
      })
      .catch(function (err) {
        showError(root, err && err.message ? err.message : '뉴스를 불러오지 못했어요.');
      });
  }

  function loadDetail(id, root) {
    showSkeleton(root);
    fetch(BASE('api/news/' + encodeURIComponent(id)))
      .then(function (res) {
        if (res.status === 404) throw new Error('글을 찾을 수 없어요.');
        return res.ok ? res.json() : Promise.reject(new Error(res.statusText || 'Network error'));
      })
      .then(function (item) {
        renderDetail(item, root);
        if (window.app && window.app.isOperator && window.app.isOperator()) {
          var token = window.app.getToken && window.app.getToken();
          if (!token) return;
          var wrap = root.querySelector('.news-detail');
          if (!wrap) return;
          var actions = document.createElement('div');
          actions.className = 'news-detail-actions';
          actions.style.cssText = 'margin-top:1.25rem;padding-top:1rem;border-top:1px solid #e2e8f0;display:flex;gap:10px;';
          actions.innerHTML = '<button type="button" class="btn btn-outline btn-sm" id="news-edit-btn">수정</button><button type="button" class="btn btn-outline btn-sm" style="color:#dc2626;" id="news-delete-btn">삭제</button>';
          wrap.appendChild(actions);
          var editBtn = document.getElementById('news-edit-btn');
          var deleteBtn = document.getElementById('news-delete-btn');
          if (editBtn) editBtn.addEventListener('click', function () {
            if (window.openNewsEditModal) window.openNewsEditModal(item);
          });
          if (deleteBtn) deleteBtn.addEventListener('click', function () {
            if (!confirm('이 뉴스를 삭제할까요?')) return;
            fetch(BASE('api/news/' + encodeURIComponent(item.id)), {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token },
            })
              .then(function (r) { return r.ok ? Promise.resolve() : r.json().then(function (d) { throw new Error(d.error || '삭제 실패'); }); })
              .then(function () { window.location.href = 'news.html'; })
              .catch(function (err) { alert(err.message || '삭제에 실패했어요.'); });
          });
        }
      })
      .catch(function (err) {
        showError(root, err && err.message ? err.message : '글을 불러오지 못했어요.');
      });
  }

  var root = document.getElementById('page-root');
  if (!root) return;

  var id = getQueryId();
  if (id) {
    loadDetail(id, root);
  } else {
    loadList(root);
  }

  window.newsRender = {
    reload: function () {
      if (!getQueryId()) loadList(root);
    },
  };
})();
