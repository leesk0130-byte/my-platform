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

  // API에 아무 뉴스도 없을 때 보여 줄 기본 뉴스 10개 (정적 fallback)
  var FALLBACK_NEWS = [
    {
      id: 'fallback-1',
      title: '2026년 PG 수수료 공시 확대, 소상공인 부담 완화 방향',
      category: 'PG수수료',
      content: '',
      date: '2026. 2. 11.'
    },
    {
      id: 'fallback-2',
      title: '네이버페이, 설 맞아 영세·중소 가맹점 현장결제 수수료 전액 지원',
      category: '간편결제',
      content: '',
      date: '2026. 2. 11.'
    },
    {
      id: 'fallback-3',
      title: '소상공인 결제 수수료 낮추는 PG사 규율체계 강화 방안',
      category: 'PG수수료',
      content: '',
      date: '2025. 9. 30.'
    },
    {
      id: 'fallback-4',
      title: '빅테크 간편결제 수수료, 카드사 최대 7배…공시제도 개편 예고',
      category: '간편결제',
      content: '',
      date: '2025. 2. 9.'
    },
    {
      id: 'fallback-5',
      title: '온라인 쇼핑몰 필수 비용: 2026년 PG 수수료·창업비용 정리',
      category: '창업가이드',
      content: '',
      date: '2026. 1. 1.'
    },
    {
      id: 'fallback-6',
      title: '전자상거래법 시행령 개정: 다크패턴 규제와 정기결제 표시의무 강화',
      category: '전자상거래법',
      content: '',
      date: '2025. 2. 14.'
    },
    {
      id: 'fallback-7',
      title: '2025년 전자상거래법 집행 5대 제재 사례와 2026년 전망',
      category: '전자상거래법',
      content: '',
      date: '2025. 12. 31.'
    },
    {
      id: 'fallback-8',
      title: '가맹본부·배달앱 갑질 근절 위한 가맹사업법·전자상거래법 개정안',
      category: '가맹·플랫폼',
      content: '',
      date: '2025. 10. 1.'
    },
    {
      id: 'fallback-9',
      title: '2025년 소상공인 디지털 전환 바우처: 온라인 쇼핑몰 구축 지원',
      category: '소상공인지원',
      content: '',
      date: '2025. 3. 1.'
    },
    {
      id: 'fallback-10',
      title: '온라인 판로 지원: 소상공인 e커머스 입점·라이브커머스 지원 확대',
      category: '소상공인지원',
      content: '',
      date: '2025. 4. 1.'
    }
  ];

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
    // API에도 없고 fallback도 비어 있지 않으면 fallback을 보여준다.
    if (FALLBACK_NEWS && FALLBACK_NEWS.length) {
      renderList(FALLBACK_NEWS, root);
      return;
    }
    root.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state-title">등록된 뉴스가 없습니다</p>' +
        '<p class="empty-state-desc">곧 최신 쇼핑몰·PG 뉴스가 올라올 예정입니다.</p>' +
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
          // DB에 뉴스가 없으면 정적 fallback 리스트를 사용
          if (FALLBACK_NEWS && FALLBACK_NEWS.length) {
            renderList(FALLBACK_NEWS, root);
          } else {
            showEmpty(root);
          }
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
