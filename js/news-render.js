/**
 * news-render.js
 * 뉴스 리스트/상세 렌더링.
 * - /api/news, /api/news/:id 우선 사용
 * - API 실패 시 Firestore news 컬렉션 fallback
 * - 상세: getPostById 대신 news 컬렉션 직접 조회 (posts와 news 분리)
 */
(function () {
  'use strict';

  var BASE = typeof window.apiUrl === 'function' ? window.apiUrl : function (path) {
    var b = (window.API_BASE_URL || '').replace(/\/$/, '');
    var p = (path || '').replace(/^\//, '');
    return b ? b + '/' + p : '/' + p;
  };

  function getDb() {
    return (window.firebase && window.firebase.apps && window.firebase.apps.length && typeof window.firebase.firestore === 'function')
      ? window.firebase.firestore()
      : null;
  }

  function getQueryId() {
    var m = /[?&]id=([^&]+)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Firestore Timestamp → ms
  function tsToMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts.seconds) return ts.seconds * 1000;
    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    return 0;
  }

  function docToNewsItem(doc) {
    var d = doc.data ? doc.data() : doc;
    var ms = tsToMs(d.createdAt);
    return {
      id: doc.id,
      title: d.title || '',
      content: d.content || d.body || '',
      category: d.category || '',
      date: ms ? new Date(ms).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      created_at: ms || 0,
      updated_at: tsToMs(d.updatedAt) || ms || 0
    };
  }

  function showSkeleton(root) {
    root.innerHTML = '<div class="skeleton-news"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line" style="width:60%"></div></div>';
  }

  function showError(root) {
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
        '<p class="empty-state-desc">관리자 로그인 후 <strong>+ 뉴스 작성</strong>으로 직접 올릴 수 있습니다.</p>' +
        '<a href="index.html" class="btn btn-outline btn-sm" style="margin-top:12px;">홈으로</a>' +
      '</div>';
  }

  function showNotFound(root) {
    root.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state-title">뉴스를 찾을 수 없어요</p>' +
        '<p class="empty-state-desc">삭제되었거나 주소가 잘못되었을 수 있어요.</p>' +
        '<a href="news.html" class="btn btn-outline btn-sm" style="margin-top:12px;">목록으로</a>' +
      '</div>';
  }

  function renderList(items, root) {
    if (!items || items.length === 0) { showEmpty(root); return; }
    var html = '<ul class="news-list">' + items.map(function (n) {
      var link = 'news.html?id=' + (n.id || '');
      var badge = (n.category || n.badge) ? '<span class="news-badge">' + (n.category || n.badge) + '</span>' : '';
      var date = n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
      return '<li class="news-item"><a href="' + link + '"><span class="news-title">' + (n.title || '') + '</span>' + badge + '<div class="news-meta">' + date + '</div></a></li>';
    }).join('') + '</ul>';
    root.innerHTML = html;
  }

  function renderDetail(item, root) {
    var date = item.date || (item.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
    var category = (item.category || item.badge) ? '<span class="news-badge">' + (item.category || item.badge) + '</span>' : '';
    var rawBody = (item.content || item.body || '');
    var body = rawBody.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    root.innerHTML =
      '<div class="news-detail">' +
        '<h1 class="news-detail-title">' + (item.title || '') + '</h1>' +
        '<div class="news-detail-meta">' + category + (category ? ' ' : '') + date + '</div>' +
        '<div class="news-detail-body">' + body + '</div>' +
      '</div>';

    // SEO: 동적 제목/메타/구조화 데이터
    try {
      var title = (item.title || '').slice(0, 80);
      if (title) document.title = title + ' | 가맹점숲 쇼핑몰 뉴스';
      var descSource = rawBody.replace(/\s+/g, ' ').trim();
      var desc = descSource.slice(0, 140);
      var metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; document.head.appendChild(metaDesc); }
      if (desc) metaDesc.content = desc;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && title) ogTitle.setAttribute('content', title);
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && desc) ogDesc.setAttribute('content', desc);
      var ldId = 'news-ld-json';
      var oldLd = document.getElementById(ldId);
      if (oldLd && oldLd.parentNode) oldLd.parentNode.removeChild(oldLd);
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.id = ldId;
      var createdIso = item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString();
      var updatedIso = item.updated_at ? new Date(item.updated_at).toISOString() : createdIso;
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        'headline': title || '',
        'datePublished': createdIso,
        'dateModified': updatedIso,
        'author': { '@type': 'Organization', 'name': '가맹점숲', 'url': 'https://bizimshop.co.kr/' },
        'publisher': { '@type': 'Organization', 'name': '가맹점숲', 'logo': { '@type': 'ImageObject', 'url': 'https://bizimshop.co.kr/og-image.svg' } },
        'mainEntityOfPage': { '@type': 'WebPage', '@id': window.location.href },
        'articleSection': item.category || '',
        'articleBody': descSource.slice(0, 5000)
      });
      document.head.appendChild(ld);
    } catch (e) {}
  }

  // Firestore articles 컬렉션 문서를 뉴스 아이템으로 변환
  function articleDocToNewsItem(doc) {
    var d = doc.data ? doc.data() : doc;
    var ms = tsToMs(d.publishedAt) || tsToMs(d.updatedAt) || tsToMs(d.createdAt);
    return {
      id: doc.id,
      title: d.title || '',
      content: d.content || d.body || '',
      category: d.category || '',
      date: ms ? new Date(ms).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      created_at: ms || 0,
      updated_at: tsToMs(d.updatedAt) || ms || 0
    };
  }

  // Firestore에서 목록 조회 (articles + news 컬렉션 병합)
  function fetchNewsFromFirestore(callback) {
    var db = getDb();
    if (!db) { callback(null, []); return; }
    var allItems = [];
    // articles 컬렉션 (admin CMS에서 작성한 글)
    db.collection('articles').where('isPublished', '==', true).orderBy('updatedAt', 'desc').limit(50).get()
      .then(function (snap) {
        snap.forEach(function (doc) { allItems.push(articleDocToNewsItem(doc)); });
      })
      .catch(function () {
        // index 없을 경우 fallback
        return db.collection('articles').limit(50).get().then(function (snap2) {
          snap2.forEach(function (doc) {
            var d = doc.data ? doc.data() : doc;
            if (d.isPublished) allItems.push(articleDocToNewsItem(doc));
          });
        }).catch(function () {});
      })
      .then(function () {
        // news 컬렉션 (레거시)
        return db.collection('news').orderBy('createdAt', 'desc').limit(50).get()
          .then(function (snap) {
            snap.forEach(function (doc) { allItems.push(docToNewsItem(doc)); });
          })
          .catch(function () {});
      })
      .then(function () {
        // 중복 제거 후 날짜순 정렬
        var seen = {};
        var unique = [];
        allItems.forEach(function (item) {
          if (!seen[item.id]) { seen[item.id] = true; unique.push(item); }
        });
        unique.sort(function (a, b) { return (b.created_at || 0) - (a.created_at || 0); });
        callback(null, unique);
      });
  }

  // Firestore에서 단건 조회 (articles 우선, news 폴백)
  function fetchNewsDetailFromFirestore(id, callback) {
    var db = getDb();
    if (!db) { callback(null, null); return; }
    // articles 컬렉션 먼저 조회
    db.collection('articles').doc(id).get()
      .then(function (doc) {
        if (doc && doc.exists) { callback(null, articleDocToNewsItem(doc)); return; }
        // news 컬렉션 폴백
        return db.collection('news').doc(id).get().then(function (doc2) {
          if (!doc2 || !doc2.exists) { callback(null, null); return; }
          callback(null, docToNewsItem(doc2));
        });
      })
      .catch(function () { callback(null, null); });
  }

  function loadList(root) {
    showSkeleton(root);
    fetch(BASE('api/news') + '?limit=50&offset=0')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('api_fail')); })
      .then(function (data) {
        var items = data.items || data || [];
        renderList(Array.isArray(items) ? items : [], root);
      })
      .catch(function () {
        // API 실패 → Firestore fallback
        fetchNewsFromFirestore(function (err, items) {
          renderList(items || [], root);
        });
      });
  }

  function attachOperatorActions(root, item) {
    if (!window.app || !window.app.isOperator || !window.app.isOperator()) return;
    var wrap = root.querySelector('.news-detail');
    if (!wrap) return;
    if (wrap.querySelector('.news-detail-actions')) return;
    var actions = document.createElement('div');
    actions.className = 'news-detail-actions';
    actions.style.cssText = 'margin-top:1.25rem;padding-top:1rem;border-top:1px solid #e2e8f0;display:flex;gap:10px;';
    actions.innerHTML =
      '<button type="button" class="btn btn-outline btn-sm" id="news-edit-btn">수정</button>' +
      '<button type="button" class="btn btn-outline btn-sm" style="color:#dc2626;" id="news-delete-btn">삭제</button>';
    wrap.appendChild(actions);

    var editBtn = document.getElementById('news-edit-btn');
    var deleteBtn = document.getElementById('news-delete-btn');

    if (editBtn) editBtn.addEventListener('click', function () {
      if (window.openNewsEditModal) window.openNewsEditModal(item);
    });

    if (deleteBtn) deleteBtn.addEventListener('click', function () {
      if (!confirm('이 뉴스를 삭제할까요?')) return;
      var token = window.app.getToken && window.app.getToken();
      // REST API 삭제 시도 → 실패 시 Firestore 직접 삭제
      fetch(BASE('api/news/' + encodeURIComponent(item.id)), {
        method: 'DELETE',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {}
      })
        .then(function (r) {
          if (r.ok) return Promise.resolve();
          return Promise.reject(new Error('api_fail'));
        })
        .catch(function () {
          var db = getDb();
          if (db) return db.collection('news').doc(item.id).delete();
          return Promise.reject(new Error('삭제할 수 없어요.'));
        })
        .then(function () { window.location.href = 'news.html'; })
        .catch(function (err) { alert(err && err.message ? err.message : '삭제에 실패했어요.'); });
    });
  }

  function loadDetail(id, root) {
    showSkeleton(root);
    fetch(BASE('api/news/' + encodeURIComponent(id)))
      .then(function (res) {
        if (res.status === 404) throw new Error('not_found');
        return res.ok ? res.json() : Promise.reject(new Error('api_fail'));
      })
      .then(function (item) {
        renderDetail(item, root);
        attachOperatorActions(root, item);
        window.addEventListener('authStateChanged', function () { attachOperatorActions(root, item); });
        setTimeout(function () { attachOperatorActions(root, item); }, 500);
      })
      .catch(function (err) {
        if (err && err.message === 'not_found') { showNotFound(root); return; }
        // API 실패 → Firestore fallback
        fetchNewsDetailFromFirestore(id, function (ferr, item) {
          if (!item) { showNotFound(root); return; }
          renderDetail(item, root);
          attachOperatorActions(root, item);
          window.addEventListener('authStateChanged', function () { attachOperatorActions(root, item); });
          setTimeout(function () { attachOperatorActions(root, item); }, 500);
        });
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
    }
  };
})();
