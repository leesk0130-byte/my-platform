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
        '<a href="community.html" class="btn btn-outline btn-sm" style="margin-top:12px;">커뮤니티 보러가기</a>' +
      '</div>';
  }

  function showEmpty(root) {
    root.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state-title">등록된 뉴스가 없습니다</p>' +
        '<p class="empty-state-desc">곧 최신 쇼핑몰·PG 뉴스가 올라올 예정입니다.</p>' +
        '<a href="community.html" class="btn btn-outline btn-sm" style="margin-top:12px;">커뮤니티 보러가기</a>' +
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
})();
