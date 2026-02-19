(function () {
  'use strict';

  var firebaseAuth = null;
  if (window.FIREBASE_CONFIG && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      firebaseAuth = firebase.auth();
      firebaseAuth.onAuthStateChanged(function (user) {
        if (user) {
          user.getIdToken().then(function (token) {
            setToken(token);
            var name = (user.email === OPERATOR_EMAIL) ? '운영자' : (user.displayName || user.email || '');
            setUser({ name: name, email: user.email || '', uid: user.uid });
            try { window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: user } })); } catch (e) {}
          });
        } else {
          setToken(null);
          setUser(null);
          try { window.dispatchEvent(new CustomEvent('authStateChanged')); } catch (e) {}
        }
      });
    } catch (e) { firebaseAuth = null; }
  }

  var BASE = typeof apiUrl === 'function' ? apiUrl : function (path) {
    var b = (window.API_BASE_URL || '').replace(/\/$/, '');
    var p = (path || '').replace(/^\//, '');
    return b ? b + '/' + p : '/' + p;
  };

  // 뉴스는 API(GET /api/news)에서만 조회. 하드코딩/목업 없음.

  // 커뮤니티 글 전부 비움 — 직접 올릴 예정
  var MOCK_POSTS = [];
  var MOCK_COMMENTS = {};
  var COMMENTS_STORAGE_PREFIX = 'merchant_plus_comments_';
  var VERIFIED_AUTHORS = { '운영자': true };
  var OPERATOR_EMAIL = 'leesk0130@point3.team';

  var STORAGE_KEY = 'merchant_plus_posts';
  var DATA_VERSION = 'community_reset_1';
  if (typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem('merchant_plus_data_version') !== DATA_VERSION) {
        localStorage.removeItem(STORAGE_KEY);
        for (var i = localStorage.length - 1; i >= 0; i--) {
          var k = localStorage.key(i);
          if (k && k.indexOf(COMMENTS_STORAGE_PREFIX) === 0) localStorage.removeItem(k);
        }
        localStorage.setItem('merchant_plus_data_version', DATA_VERSION);
      }
      // 공지/고정 카드 캐시 제거 (렌더링은 API·로컬 글 데이터만 사용)
      ['notice', 'announcement', 'pinned', 'pinnedNotice', 'notices'].forEach(function(key) {
        try { localStorage.removeItem(key); } catch (e2) {}
      });
    } catch (e) {}
  }

  function getLocalPosts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalPosts(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function addLocalPost(data) {
    var list = getLocalPosts();
    var id = 'local_' + Date.now();
    var u = getUser();
    var post = {
      id: id,
      title: data.title || '',
      body: data.body || '',
      author: data.author || '익명',
      authorId: data.authorId != null ? data.authorId : (u ? u.uid : null),
      date: formatRelativeDate(new Date()),
      board: data.board || 'free',
      hits: 0,
      verified: false,
      notice: !!(data.notice),
      createdAt: new Date().toISOString()
    };
    list.unshift(post);
    saveLocalPosts(list);
    return post;
  }

  function canEditPost(post) {
    if (!post) return false;
    var u = getUser();
    if (!u || !u.uid) return false;
    if (isOperator()) return true;
    return post.authorId === u.uid;
  }

  function deletePost(postId, callback) {
    var post = getLocalPostById(postId);
    if (!post) { if (callback) callback('글을 찾을 수 없어요.'); return; }
    if (!canEditPost(post)) { if (callback) callback('수정 권한이 없습니다.'); return; }
    var list = getLocalPosts().filter(function (p) { return p.id !== postId; });
    saveLocalPosts(list);
    if (callback) callback(null);
  }

  function updatePost(postId, data, callback) {
    var list = getLocalPosts();
    var idx = list.findIndex(function (p) { return p.id === postId; });
    if (idx === -1) { if (callback) callback('글을 찾을 수 없어요.'); return; }
    var post = list[idx];
    if (!canEditPost(post)) { if (callback) callback('수정 권한이 없습니다.'); return; }
    if (data.title != null) list[idx].title = data.title;
    if (data.body != null) list[idx].body = data.body;
    if (data.board != null) list[idx].board = data.board;
    list[idx].date = formatRelativeDate(new Date());
    saveLocalPosts(list);
    if (callback) callback(null, list[idx]);
  }

  function togglePostNotice(postId, callback) {
    var list = getLocalPosts();
    var idx = list.findIndex(function (p) { return p.id === postId; });
    if (idx === -1) { if (callback) callback('글을 찾을 수 없어요.'); return; }
    list[idx].notice = !list[idx].notice;
    saveLocalPosts(list);
    if (callback) callback(null);
  }

  function getCommentsStorageKey(postId) { return COMMENTS_STORAGE_PREFIX + (postId || ''); }
  function getLocalComments(postId) {
    try {
      return JSON.parse(localStorage.getItem(getCommentsStorageKey(postId)) || '[]');
    } catch (e) { return []; }
  }
  function getMockComments(postId) {
    var now = Date.now();
    return (MOCK_COMMENTS[postId] || []).map(function (c, i) {
      return { id: c.id, author: c.author, date: c.date, body: c.body, verified: c.verified, createdAt: now - 3600000 * (i + 2) };
    });
  }
  function commentSortKey(c) {
    if (c.createdAt != null) return Number(c.createdAt);
    var m = (c.id || '').toString().match(/comment_(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function getComments(postId, callback) {
    var url = BASE('api/community/posts/' + (postId || '') + '/comments');
    fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (data) { callback(null, data.items || data || []); })
      .catch(function () {
        var local = getLocalComments(postId);
        var hidden = getHiddenCommentIds(postId);
        var mock = getMockComments(postId).filter(function (c) { return hidden.indexOf(c.id) === -1; });
        var combined = local.concat(mock);
        combined.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
        callback(null, combined);
      });
  }
  function addLocalComment(postId, data) {
    var list = getLocalComments(postId);
    var id = 'comment_' + Date.now();
    var now = Date.now();
    var comment = {
      id: id,
      author: data.author || '익명',
      date: formatRelativeDate(new Date()),
      body: data.body || '',
      verified: false,
      createdAt: now
    };
    list.push(comment);
    try { localStorage.setItem(getCommentsStorageKey(postId), JSON.stringify(list)); } catch (e) {}
    return comment;
  }
  var HIDDEN_COMMENTS_PREFIX = 'merchant_plus_hidden_comments_';
  function getHiddenCommentIds(postId) {
    try {
      return JSON.parse(localStorage.getItem(HIDDEN_COMMENTS_PREFIX + (postId || '')) || '[]');
    } catch (e) { return []; }
  }
  function addHiddenCommentId(postId, commentId) {
    var ids = getHiddenCommentIds(postId);
    if (ids.indexOf(commentId) === -1) { ids.push(commentId); localStorage.setItem(HIDDEN_COMMENTS_PREFIX + (postId || ''), JSON.stringify(ids)); }
  }
  function deleteComment(postId, commentId, callback) {
    if ((commentId || '').toString().indexOf('comment_') === 0) {
      var list = getLocalComments(postId).filter(function (c) { return c.id !== commentId; });
      try { localStorage.setItem(getCommentsStorageKey(postId), JSON.stringify(list)); } catch (e) {}
    } else {
      addHiddenCommentId(postId, commentId);
    }
    if (callback) callback();
  }
  function isOperator() {
    var u = getUser();
    if (!u) return false;
    if (u.name === '운영자') return true;
    var em = (u.email || '').toString().toLowerCase().trim();
    return em === OPERATOR_EMAIL.toLowerCase();
  }
  function addComment(postId, data, callback) {
    var url = BASE('api/community/posts/' + (postId || '') + '/comments');
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ author: data.author || '익명', body: data.body || '' })
    }).then(function (res) { return res.json(); })
      .then(function (result) {
        if (result.id && callback) callback(null, result);
        else if (callback) callback(result.error || result.message || '등록 실패');
      })
      .catch(function () {
        var comment = addLocalComment(postId, data);
        if (callback) callback(null, comment);
      });
  }
  function isAuthorVerified(author) { return VERIFIED_AUTHORS[author] === true; }
  function verifiedBadgeHtml(verified, author) {
    if (!verified) return '';
    if (author === '운영자') return ' <span class="operator-badge" aria-label="운영자">운영자</span>';
    return ' <span class="verified-badge" aria-label="인증된 회원">인증</span>';
  }

  function getLocalPostById(id) {
    var list = getLocalPosts();
    return list.filter(function (p) { return p.id === id; })[0] || null;
  }

  function formatRelativeDate(d) {
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '일 전';
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getToken() {
    return localStorage.getItem('token');
  }
  function setToken(t) {
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
  }
  function setUser(u) {
    if (u && u.email === OPERATOR_EMAIL) { u = Object.assign({}, u, { name: '운영자' }); }
    if (u) localStorage.setItem('user', JSON.stringify(u)); else localStorage.removeItem('user');
  }
  function getUser() {
    try {
      var u = localStorage.getItem('user');
      u = u ? JSON.parse(u) : null;
      if (u && u.email === OPERATOR_EMAIL) { u = Object.assign({}, u, { name: '운영자' }); }
      return u;
    } catch (e) { return null; }
  }

  function logout() {
    if (firebaseAuth) firebaseAuth.signOut();
    setToken(null);
    setUser(null);
  }

  // 조회수 관리 함수들
  var POST_VIEWS_KEY = 'post_views_map';
  var LAST_VIEWED_KEY = 'last_viewed_map';
  var VIEW_COOLDOWN = 5 * 60 * 1000; // 5분으로 변경 (또는 완전 제거)

  function getPostViews() {
    try {
      return JSON.parse(localStorage.getItem(POST_VIEWS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function getLastViewed() {
    try {
      return JSON.parse(localStorage.getItem(LAST_VIEWED_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function incrementPostViews(postId) {
    if (!postId) return false;
    
    // 쿨다운 없이 매번 조회수 증가
    var views = getPostViews();
    views[postId] = (views[postId] || 0) + 1;
    localStorage.setItem(POST_VIEWS_KEY, JSON.stringify(views));
    
    return true;
  }

  function getPostViewCount(postId) {
    var views = getPostViews();
    return views[postId] || 0;
  }

  function showToast(message, type) {
    var text = (message || '').toString().trim();
    if (text === '잠시 후 다시 시도해 주세요.' || text === '') return;
    type = type || 'default';
    var container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
    toast.setAttribute('role', 'alert');
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  }

  window.app = {
    apiUrl: BASE,
    getToken: getToken,
    setToken: setToken,
    setUser: setUser,
    getUser: getUser,
    isLoggedIn: function () { return !!getToken(); },
    logout: logout,

    fetchNews: function (limit, offset, callback) {
      var url = BASE('api/news') + '?limit=' + (limit || 10) + '&offset=' + (offset || 0);
      fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(new Error(res.statusText || 'Network error')); })
        .then(function (data) {
          var items = data.items || data || [];
          var total = data.total != null ? data.total : items.length;
          callback(null, items, total);
        })
        .catch(function (err) {
          callback(err && err.message ? err.message : '뉴스를 불러오지 못했어요.', [], 0);
        });
    },

    fetchPosts: function (board, limit, offset, callback, sort) {
      // API·목업 사용 안 함. 로컬 저장 글만 표시(비어 있음, 글쓰기로 올리면 그만 보임)
      // sort: 'latest' | 'hits' | 'comments' (기본 최신순)
      var local = getLocalPosts();
      var list = local.map(function (p) {
        var localComments = getLocalComments(p.id);
        var additionalViews = typeof getPostViewCount === 'function' ? getPostViewCount(p.id) : 0;
        return {
          id: p.id,
          title: p.title,
          author: p.author,
          date: p.date,
          board: p.board || 'free',
          hits: (p.hits != null ? p.hits : 0) + additionalViews,
          verified: p.verified,
          notice: !!p.notice,
          commentCount: localComments.length,
          body: p.body,
          createdAt: p.createdAt
        };
      });
      var filtered = (board && board !== 'all') ? list.filter(function (p) { return p.board === board; }) : list;
      filtered.sort(function (a, b) {
        if (b.notice && !a.notice) return 1;
        if (a.notice && !b.notice) return -1;
        var order = sort || 'latest';
        if (order === 'hits') return (b.hits || 0) - (a.hits || 0);
        if (order === 'comments') return (b.commentCount || 0) - (a.commentCount || 0);
        var ta = (a.createdAt && new Date(a.createdAt).getTime()) || 0;
        var tb = (b.createdAt && new Date(b.createdAt).getTime()) || 0;
        return tb - ta;
      });
      if (callback) callback(null, filtered.slice(offset || 0, (offset || 0) + (limit || 20)), filtered.length);
    },

    getPostsByIds: function (ids, callback) {
      if (!ids || !ids.length) { if (callback) callback(null, []); return; }
      var local = getLocalPosts();
      var withComments = local.map(function (p) {
        var localComments = getLocalComments(p.id);
        var additionalViews = typeof getPostViewCount === 'function' ? getPostViewCount(p.id) : 0;
        return {
          id: p.id,
          title: p.title,
          author: p.author,
          date: p.date,
          board: p.board || 'free',
          hits: (p.hits != null ? p.hits : 0) + additionalViews,
          verified: p.verified,
          notice: !!p.notice,
          commentCount: localComments.length,
          body: p.body,
          createdAt: p.createdAt
        };
      });
      var idSet = {};
      ids.forEach(function (id) { idSet[id] = true; });
      var ordered = ids.map(function (id) {
        return withComments.filter(function (p) { return p.id === id; })[0];
      }).filter(Boolean);
      if (callback) callback(null, ordered);
    },

    getRelatedPosts: function (postId, limit, callback) {
      var post = getLocalPostById(postId);
      if (!post) { if (callback) callback(null, []); return; }
      var board = post.board || 'free';
      var local = getLocalPosts();
      var withComments = local.map(function (p) {
        var localComments = getLocalComments(p.id);
        var additionalViews = typeof getPostViewCount === 'function' ? getPostViewCount(p.id) : 0;
        return {
          id: p.id,
          title: p.title,
          author: p.author,
          date: p.date,
          board: p.board || 'free',
          hits: (p.hits != null ? p.hits : 0) + additionalViews,
          verified: p.verified,
          notice: !!p.notice,
          commentCount: localComments.length,
          body: p.body,
          createdAt: p.createdAt
        };
      });
      var related = withComments
        .filter(function (p) { return p.id !== postId && (p.board || 'free') === board; })
        .sort(function (a, b) {
          var ta = (a.createdAt && new Date(a.createdAt).getTime()) || 0;
          var tb = (b.createdAt && new Date(b.createdAt).getTime()) || 0;
          return tb - ta;
        })
        .slice(0, limit || 5);
      if (callback) callback(null, related);
    },

    getLocalPosts: getLocalPosts,
    addLocalPost: addLocalPost,
    getLocalPostById: getLocalPostById,

    renderNews: function (containerId, list, linkPrefix) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var prefix = linkPrefix || '';
      var items = list || [];
      el.innerHTML = items.map(function (n) {
        var link = (n.id ? (prefix + 'news.html?id=' + n.id) : '#');
        var badge = (n.category || n.badge) ? '<span class="news-badge">' + (n.category || n.badge) + '</span>' : '';
        var date = n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
        return '<li class="news-item"><a href="' + link + '"><span class="news-title">' + (n.title || '') + '</span>' + badge + '<div class="news-meta">' + date + ' · 가맹점숲</div></a></li>';
      }).join('');
    },

    renderPosts: function (containerId, list, detailUrl, showBoardBadge) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var base = detailUrl || 'community.html?id=';
      var boardLabels = { free: '자유', fee: '수수료/정산', qna: '질문답변', info: '정보공유' };
      var isOp = isOperator();
      el.innerHTML = (list || []).map(function (p) {
        var href = base + (p.id || '');
        var board = p.board || 'free';
        var badge = showBoardBadge ? '<span class="feed-board-badge">' + (boardLabels[board] || board) + '</span>' : '';
        var noticeBadge = p.notice ? '<span class="notice-badge">공지</span>' : '';
        var verified = (p.verified === true || isAuthorVerified(p.author)) ? verifiedBadgeHtml(true, p.author) : '';
        var meta = (p.author ? p.author + ' · ' : '') + (p.date || '') + (p.hits != null ? ' · 조회 ' + p.hits : '') + verified;
        var commentCount = p.commentCount || 0;
        var commentBadge = commentCount > 0 ? '<span class="comment-count-badge">' + commentCount + '</span>' : '';
        var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn btn btn-outline btn-sm" data-post-id="' + (p.id || '').replace(/"/g, '&quot;') + '">' + (p.notice ? '공지 해제' : '공지') + '</button>' : '';
        return '<li class="feed-item feed-item-row">' +
          '<a href="' + href + '" class="feed-title-wrapper">' +
            '<span class="feed-title-content feed-title-row">' + noticeBadge + badge + '<span class="feed-title-text">' + (p.title || '') + '</span></span>' +
            commentBadge +
          '</a>' +
          '<span class="feed-meta">' + meta + '</span>' +
          (noticeBtn ? '<span class="feed-operator-actions">' + noticeBtn + '</span>' : '') +
        '</li>';
      }).join('');
    },

    getNoticePosts: function (board, callback) {
      var notices = [
        { id: '4', title: '결제 오류 시 PG사 대응 팁 공유합니다', board: 'info', notice: true }
      ];
      var filtered = (!board || board === 'all') ? notices : notices.filter(function (n) { return n.board === board; });
      if (callback) callback(null, filtered);
    },
    getComments: getComments,
    addComment: addComment,
    addLocalComment: addLocalComment,
    deleteComment: deleteComment,
    isOperator: isOperator,
    togglePostNotice: togglePostNotice,
    renderComments: function (containerId, list, opts) {
      var el = document.getElementById(containerId);
      if (!el) return;
      opts = opts || {};
      var postId = opts.postId;
      var canDelete = opts.canDelete === true && postId;
      if (!list || list.length === 0) {
        el.innerHTML = '<li class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</li>';
        return;
      }
      el.innerHTML = list.map(function (c) {
        var verified = (c.verified === true || isAuthorVerified(c.author)) ? verifiedBadgeHtml(true, c.author) : '';
        var metaText = '<span class="comment-meta-info">' + (c.author || '익명') + verified + ' · ' + (c.date || '') + '</span>';
        var delBtn = canDelete ? '<button type="button" class="comment-delete-btn" data-post-id="' + (postId || '').replace(/"/g, '&quot;') + '" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '" aria-label="댓글 삭제">삭제</button>' : '';
        return '<li class="comment-item"><div class="comment-meta">' + metaText + delBtn + '</div><div class="comment-body">' + (c.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div></li>';
      }).join('');
    },
    isAuthorVerified: isAuthorVerified,
    verifiedBadgeHtml: verifiedBadgeHtml,

    createPost: function (data, callback) {
      var url = BASE('api/community/posts');
      var token = getToken();
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          author: data.author || '익명',
          board: data.board || 'free'
        })
      }).then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.id) {
            if (callback) callback(null, result);
          } else if (callback) callback(result.error || result.message || '등록 실패');
        })
        .catch(function () {
          var u = getUser();
          var post = addLocalPost({ title: data.title, body: data.body, author: data.author, board: data.board, notice: data.notice, authorId: u ? u.uid : null });
          if (callback) callback(null, post);
        });
    },

    canEditPost: canEditPost,
    deletePost: deletePost,
    updatePost: updatePost,

    login: function (email, password, callback) {
      if (firebaseAuth) {
        firebaseAuth.signInWithEmailAndPassword(email, password)
          .then(function (userCred) {
            var user = userCred.user;
            return user.getIdToken().then(function (token) {
              setToken(token);
              setUser({ name: user.displayName || user.email || '', email: user.email || '', uid: user.uid });
              if (callback) callback(null, { user: { name: user.displayName || user.email, email: user.email } });
            });
          })
          .catch(function (err) {
            var code = err.code || '';
            var msg = code === 'auth/user-not-found' ? '등록되지 않은 이메일이에요.' : code === 'auth/wrong-password' ? '비밀번호가 틀려요.' : code === 'auth/invalid-email' ? '이메일 형식을 확인해 주세요.' : code === 'auth/too-many-requests' ? '잠시 후 다시 시도해 주세요.' : code === 'auth/operation-not-allowed' ? '이메일 로그인이 설정되지 않았어요. Firebase 콘솔에서 이메일/비밀번호 사용을 켜 주세요.' : code === 'auth/unauthorized-domain' ? '이 사이트 도메인이 Firebase 허용 목록에 없어요. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 이 주소를 추가해 주세요.' : (err.message || '로그인 실패');
            if (callback) callback(msg);
          });
        return;
      }
      fetch(BASE('api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      }).then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.token) {
            setToken(data.token);
            setUser(data.user || {});
            if (callback) callback(null, data);
          } else if (callback) callback(data.error || '로그인 실패');
        })
        .catch(function (err) {
          if (callback) callback('서버에 연결할 수 없어요. 서버를 켜 두면 로그인됩니다.');
        });
    },

    signup: function (name, email, password, callback) {
      if (firebaseAuth) {
        firebaseAuth.createUserWithEmailAndPassword(email, password)
          .then(function (userCred) {
            var user = userCred.user;
            return user.updateProfile({ displayName: name }).then(function () {
              return user.getIdToken();
            }).then(function (token) {
              setToken(token);
              setUser({ name: name, email: user.email || email, uid: user.uid });
              if (callback) callback(null, { user: { name: name, email: user.email } });
            });
          })
          .catch(function (err) {
            var code = err.code || '';
            var msg = code === 'auth/email-already-in-use' ? '이미 사용 중인 이메일이에요.' : code === 'auth/weak-password' ? '비밀번호는 6자 이상이에요.' : code === 'auth/invalid-email' ? '이메일 형식을 확인해 주세요.' : code === 'auth/operation-not-allowed' ? '이메일 가입이 설정되지 않았어요. Firebase 콘솔에서 이메일/비밀번호 사용을 켜 주세요.' : code === 'auth/unauthorized-domain' ? '이 사이트 도메인이 Firebase 허용 목록에 없어요. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 이 주소를 추가해 주세요.' : (err.message || '가입 실패');
            if (callback) callback(msg);
          });
        return;
      }
      fetch(BASE('api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password })
      }).then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.token) {
            setToken(data.token);
            setUser(data.user || {});
            if (callback) callback(null, data);
          } else if (callback) callback(data.error || '가입 실패');
        })
        .catch(function () {
          if (callback) callback('서버에 연결할 수 없어요. 서버를 켜 두면 회원가입됩니다.');
        });
    },

    showToast: showToast,
    
    // 조회수 관련 함수들
    incrementPostViews: incrementPostViews,
    getPostViewCount: getPostViewCount
  };
})();
