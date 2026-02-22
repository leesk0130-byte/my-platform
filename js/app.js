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

  var db = null;
  try {
    if (window.FIREBASE_CONFIG && window.firebase && typeof window.firebase.firestore === 'function') {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.firestore();
    }
  } catch (e) { db = null; }

  function firestoreDocToPost(docSnap) {
    if (!docSnap || !docSnap.exists) return null;
    var d = docSnap.data ? docSnap.data() : docSnap;
    var createdAt = d.createdAt;
    if (createdAt && typeof createdAt.toDate === 'function') createdAt = createdAt.toDate().toISOString();
    else if (createdAt && typeof createdAt !== 'string') createdAt = (createdAt && createdAt.seconds) ? new Date(createdAt.seconds * 1000).toISOString() : (d.createdAt || '');
    return {
      id: docSnap.id,
      title: d.title || '',
      body: d.body || '',
      author: d.author || '익명',
      authorId: d.authorId != null ? d.authorId : null,
      board: d.board || 'free',
      hits: typeof d.hits === 'number' ? d.hits : 0,
      verified: !!d.verified,
      notice: !!d.notice,
      industry: d.industry || '',
      monthlyVolume: d.monthlyVolume || '',
      pgUsed: d.pgUsed || '',
      createdAt: createdAt || new Date().toISOString(),
      commentCount: typeof d.commentCount === 'number' ? d.commentCount : 0,
      likeCount: typeof d.likeCount === 'number' ? d.likeCount : 0
    };
  }

  // 뉴스는 API(GET /api/news)에서만 조회. 하드코딩/목업 없음.

  // 커뮤니티 글 전부 비움 — 직접 올릴 예정
  var MOCK_POSTS = [];
  var MOCK_COMMENTS = {};
  var COMMENTS_STORAGE_PREFIX = 'merchant_plus_comments_';
  var VERIFIED_AUTHORS = { '운영자': true };
  var OPERATOR_EMAIL = 'leesk0130@point3.team';

  var STORAGE_KEY = 'merchant_plus_posts';
  var DATA_VERSION = 'community_reset_1';
  if (typeof localStorage !== 'undefined' && localStorage.getItem('merchant_plus_data_version') !== DATA_VERSION) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (k && k.indexOf(COMMENTS_STORAGE_PREFIX) === 0) localStorage.removeItem(k);
      }
      localStorage.setItem('merchant_plus_data_version', DATA_VERSION);
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
      board: data.board || 'free',
      hits: 0,
      verified: false,
      notice: !!(data.notice),
      industry: data.industry || '',
      monthlyVolume: data.monthlyVolume || '',
      pgUsed: data.pgUsed || '',
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
    function doLocalDelete() {
      var list = getLocalPosts().filter(function (p) { return p.id !== postId; });
      saveLocalPosts(list);
      if (callback) callback(null);
    }
    function tryDelete(post) {
      if (!post) { if (callback) callback('글을 찾을 수 없어요.'); return; }
      if (!canEditPost(post)) { if (callback) callback('수정 권한이 없습니다.'); return; }
      if (db && String(postId).indexOf('local_') !== 0) {
        db.collection('posts').doc(postId).delete().then(function () { if (callback) callback(null); }).catch(function () { doLocalDelete(); });
      } else {
        doLocalDelete();
      }
    }
    if (db && String(postId).indexOf('local_') !== 0) {
      db.collection('posts').doc(postId).get().then(function (doc) {
        tryDelete(doc.exists ? firestoreDocToPost(doc) : getLocalPostById(postId));
      }).catch(function () {
        tryDelete(getLocalPostById(postId));
      });
    } else {
      tryDelete(getLocalPostById(postId));
    }
  }

  function updatePost(postId, data, callback) {
    function doLocalUpdate() {
      var list = getLocalPosts();
      var idx = list.findIndex(function (p) { return p.id === postId; });
      if (idx === -1) { if (callback) callback('글을 찾을 수 없어요.'); return; }
      if (data.title != null) list[idx].title = data.title;
      if (data.body != null) list[idx].body = data.body;
      if (data.board != null) list[idx].board = data.board;
      saveLocalPosts(list);
      if (callback) callback(null, list[idx]);
    }
    function tryUpdate(post) {
      if (!post) { if (callback) callback('글을 찾을 수 없어요.'); return; }
      if (!canEditPost(post)) { if (callback) callback('수정 권한이 없습니다.'); return; }
      if (db && String(postId).indexOf('local_') !== 0) {
        var upd = {};
        if (data.title != null) upd.title = data.title;
        if (data.body != null) upd.body = data.body;
        if (data.board != null) upd.board = data.board;
        if (Object.keys(upd).length === 0) { if (callback) callback(null, post); return; }
        db.collection('posts').doc(postId).update(upd).then(function () {
          if (callback) callback(null, Object.assign({}, post, upd));
        }).catch(function () { doLocalUpdate(); });
      } else {
        doLocalUpdate();
      }
    }
    if (db && String(postId).indexOf('local_') !== 0) {
      db.collection('posts').doc(postId).get().then(function (doc) {
        tryUpdate(doc.exists ? firestoreDocToPost(doc) : getLocalPostById(postId));
      }).catch(function () {
        tryUpdate(getLocalPostById(postId));
      });
    } else {
      tryUpdate(getLocalPostById(postId));
    }
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
      var createdAt = new Date(now - 3600000 * (i + 2)).toISOString();
      return { id: c.id, author: c.author, body: c.body, verified: c.verified, createdAt: createdAt };
    });
  }
  function commentSortKey(c) {
    if (c.createdAt != null) {
      var t = Number(c.createdAt);
      if (!isNaN(t)) return t;
      var d = new Date(c.createdAt);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    var m = (c.id || '').toString().match(/comment_(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  function getComments(postId, callback) {
    var url = BASE('api/community/posts/' + (postId || '') + '/comments');
    function fallbackFirestore() {
      if (db) {
        db.collection('posts').doc(postId).collection('comments').orderBy('createdAt', 'asc').get()
          .then(function (snap) {
            var list = [];
            snap.forEach(function (doc) {
              var d = doc.data();
              var createdAt = d.createdAt;
              if (createdAt && typeof createdAt.toDate === 'function') createdAt = createdAt.toDate().toISOString();
              else if (createdAt && typeof createdAt !== 'string' && createdAt && createdAt.seconds) createdAt = new Date(createdAt.seconds * 1000).toISOString();
              list.push({
                id: doc.id,
                author: d.author || '익명',
                body: d.body || '',
                parentId: d.parentId || null,
                verified: !!d.verified,
                createdAt: createdAt || ''
              });
            });
            list.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
            callback(null, list);
          })
          .catch(function () {
            var local = getLocalComments(postId);
            var hidden = getHiddenCommentIds(postId);
            var mock = getMockComments(postId).filter(function (c) { return hidden.indexOf(c.id) === -1; });
            var combined = local.concat(mock);
            combined.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
            callback(null, combined);
          });
        return;
      }
      var local = getLocalComments(postId);
      var hidden = getHiddenCommentIds(postId);
      var mock = getMockComments(postId).filter(function (c) { return hidden.indexOf(c.id) === -1; });
      var combined = local.concat(mock);
      combined.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
      callback(null, combined);
    }
    fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function (data) { callback(null, data.items || data || []); })
      .catch(fallbackFirestore);
  }
  function addLocalComment(postId, data) {
    var list = getLocalComments(postId);
    var id = 'comment_' + Date.now();
    var comment = {
      id: id,
      parentId: data.parentId || null,
      author: data.author || '익명',
      body: data.body || '',
      verified: false,
      createdAt: new Date().toISOString()
    };
    list.push(comment);
    try { localStorage.setItem(getCommentsStorageKey(postId), JSON.stringify(list)); } catch (e) {}
    return comment;
  }
  var LIKES_STORAGE_KEY = 'merchant_plus_likes';
  var LIKED_POSTS_KEY = 'merchant_plus_liked_posts';
  function getLikesMap() {
    try { return JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function getLikedPosts() {
    try { return JSON.parse(localStorage.getItem(LIKED_POSTS_KEY) || '[]'); } catch (e) { return []; }
  }
  function setLikedPosts(arr) {
    try { localStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function hasUserLikedPost(postId) {
    return getLikedPosts().indexOf(String(postId)) !== -1;
  }
  function getPostLikeCount(postId) {
    var m = getLikesMap();
    return typeof m[postId] === 'number' ? m[postId] : 0;
  }
  function setPostLike(postId, delta) {
    var m = getLikesMap();
    m[postId] = Math.max(0, (m[postId] || 0) + delta);
    try { localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(m)); } catch (e) {}
    return m[postId];
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
    function fallbackFirestore() {
      if (db) {
        var payload = {
          author: data.author || '익명',
          body: data.body || '',
          parentId: data.parentId || null,
          createdAt: new Date().toISOString(),
          verified: false
        };
        db.collection('posts').doc(postId).collection('comments').add(payload).then(function (ref) {
          var comment = { id: ref.id, author: payload.author, body: payload.body, parentId: payload.parentId, createdAt: payload.createdAt, verified: false };
          var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
          if (inc) {
            db.collection('posts').doc(postId).update({ commentCount: inc(1) }).catch(function () {});
          }
          if (callback) callback(null, comment);
        }).catch(function () {
          fallbackLocal();
        });
        return;
      }
      fallbackLocal();
    }
    function fallbackLocal() {
      try {
        var comment = addLocalComment(postId, data);
        if (callback) callback(null, comment);
      } catch (e) {
        if (callback) callback(e && e.message ? e.message : '댓글 등록에 실패했어요.');
      }
    }
    fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ author: data.author || '익명', body: data.body || '', parentId: data.parentId || null })
    }).then(function (res) {
      if (!res.ok) throw new Error('API failed');
      return res.json();
    }).then(function (result) {
      if (result && result.id && callback) callback(null, result);
      else if (callback) callback(result && (result.error || result.message) ? (result.error || result.message) : '등록 실패');
    }).catch(fallbackFirestore);
  }
  function togglePostLike(postId, callback) {
    var sid = String(postId);
    var liked = getLikedPosts();
    var u = getUser();
    var anonId = localStorage.getItem('merchant_plus_anon_id');
    if (!anonId) {
      anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      try { localStorage.setItem('merchant_plus_anon_id', anonId); } catch (e) {}
    }
    var userId = (u && u.uid) ? u.uid : anonId;
    function syncLocalAndCallback(newCount, alreadyLiked) {
      setPostLike(postId, newCount);
      if (alreadyLiked) setLikedPosts(liked.filter(function (id) { return id !== sid; }));
      else setLikedPosts(liked.concat(sid));
      if (callback) callback(null, newCount);
    }
    if (db && sid.indexOf('local_') !== 0) {
      var likeRef = db.collection('posts').doc(postId).collection('likes').doc(userId);
      var postRef = db.collection('posts').doc(postId);
      var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
      likeRef.get().then(function (likeSnap) {
        var alreadyLiked = likeSnap.exists;
        postRef.get().then(function (postSnap) {
          var curCount = postSnap.exists && postSnap.data() ? (postSnap.data().likeCount || 0) : 0;
          if (alreadyLiked) {
            likeRef.delete().then(function () {
              if (inc) postRef.update({ likeCount: inc(-1) }).then(function () { syncLocalAndCallback(Math.max(0, curCount - 1), true); }).catch(function () { syncLocalAndCallback(Math.max(0, curCount - 1), true); });
              else syncLocalAndCallback(Math.max(0, curCount - 1), true);
            }).catch(function () { syncLocalAndCallback(getPostLikeCount(postId), true); });
          } else {
            likeRef.set({ createdAt: new Date().toISOString() }).then(function () {
              if (inc) postRef.update({ likeCount: inc(1) }).then(function () { syncLocalAndCallback(curCount + 1, false); }).catch(function () { syncLocalAndCallback(curCount + 1, false); });
              else syncLocalAndCallback(curCount + 1, false);
            }).catch(function () { syncLocalAndCallback(getPostLikeCount(postId), false); });
          }
        }).catch(function () {
          var already = liked.indexOf(sid) !== -1;
          if (already) { setPostLike(postId, -1); setLikedPosts(liked.filter(function (id) { return id !== sid; })); }
          else { setPostLike(postId, 1); setLikedPosts(liked.concat(sid)); }
          if (callback) callback(null, getPostLikeCount(postId));
        });
      }).catch(function () {
        var already = liked.indexOf(sid) !== -1;
        if (already) { setPostLike(postId, -1); setLikedPosts(liked.filter(function (id) { return id !== sid; })); }
        else { setPostLike(postId, 1); setLikedPosts(liked.concat(sid)); }
        if (callback) callback(null, getPostLikeCount(postId));
      });
      return;
    }
    var alreadyLiked = liked.indexOf(sid) !== -1;
    if (alreadyLiked) {
      setPostLike(postId, -1);
      setLikedPosts(liked.filter(function (id) { return id !== sid; }));
    } else {
      setPostLike(postId, 1);
      setLikedPosts(liked.concat(sid));
    }
    if (callback) callback(null, getPostLikeCount(postId));
  }
  function uploadImageToStorage(file, callback) {
    if (!window.firebase || !window.firebase.storage) {
      if (callback) callback('이미지 업로드 기능을 사용하려면 Firebase Storage가 필요합니다.');
      return;
    }
    try {
      var storage = firebase.storage();
      var ref = storage.ref('community/' + Date.now() + '_' + Math.random().toString(36).slice(2) + (file.name ? '_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '') : ''));
      ref.put(file).then(function () {
        ref.getDownloadURL().then(function (url) {
          if (callback) callback(null, url);
        }).catch(function (err) {
          if (callback) callback(err && err.message ? err.message : 'URL을 가져오지 못했어요.');
        });
      }).catch(function (err) {
        if (callback) callback(err && err.message ? err.message : '업로드에 실패했어요.');
      });
    } catch (e) {
      if (callback) callback(e && e.message ? e.message : '업로드 중 오류가 났어요.');
    }
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
    var now = Date.now();
    var lastMap = getLastViewed();
    var last = lastMap[postId];
    if (last != null && (now - last) < VIEW_COOLDOWN) return false;
    lastMap[postId] = now;
    try { localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(lastMap)); } catch (e) {}
    if (db && String(postId).indexOf('local_') !== 0) {
      var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
      if (inc) db.collection('posts').doc(postId).update({ hits: inc(1) }).catch(function () {});
    }
    var views = getPostViews();
    views[postId] = (views[postId] || 0) + 1;
    try { localStorage.setItem(POST_VIEWS_KEY, JSON.stringify(views)); } catch (e) {}
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
      var order = sort || 'latest';
      var lim = limit || 20;
      var off = offset || 0;
      function finish(list) {
        var filtered = (board && board !== 'all') ? list.filter(function (p) { return (p.board || 'free') === board; }) : list.slice();
        filtered.sort(function (a, b) {
          if (b.notice && !a.notice) return 1;
          if (a.notice && !b.notice) return -1;
          if (order === 'hits') return (b.hits || 0) - (a.hits || 0);
          if (order === 'comments') return (b.commentCount || 0) - (a.commentCount || 0);
          if (order === 'likes') return (b.likeCount || 0) - (a.likeCount || 0);
          var ta = (a.createdAt && new Date(a.createdAt).getTime()) || 0;
          var tb = (b.createdAt && new Date(b.createdAt).getTime()) || 0;
          return tb - ta;
        });
        if (callback) callback(null, filtered.slice(off, off + lim), filtered.length);
      }
      if (db) {
        db.collection('posts').orderBy('createdAt', 'desc').get()
          .then(function (snap) {
            var list = [];
            try {
              snap.forEach(function (doc) {
                try {
                  var p = firestoreDocToPost(doc);
                  if (p) list.push(p);
                } catch (docErr) {
                  console.warn('[app.js fetchPosts] doc 변환 실패, 건너뜀', doc.id, docErr);
                }
              });
            } catch (e) {
              console.error('[app.js fetchPosts] forEach 중 오류', e);
            }
            finish(list);
          })
          .catch(function (e) {
            var msg = (e && (e.message || e.code)) ? String(e.message || e.code) : '목록을 불러오지 못했어요.';
            console.error('[app.js fetchPosts] Firestore get 실패', e);
            var local = getLocalPosts();
            var list = local.map(function (p) {
              var localComments = getLocalComments(p.id);
              var additionalViews = typeof getPostViewCount === 'function' ? getPostViewCount(p.id) : 0;
              return {
                id: p.id,
                title: p.title,
                author: p.author,
                board: p.board || 'free',
                hits: (p.hits != null ? p.hits : 0) + additionalViews,
                verified: p.verified,
                notice: !!p.notice,
                commentCount: localComments.length,
                likeCount: getPostLikeCount(p.id),
                body: p.body,
                createdAt: p.createdAt
              };
            });
            if (list.length > 0) {
              finish(list);
            } else if (callback) {
              callback(msg, [], 0);
            }
          });
        return;
      }
      var local = getLocalPosts();
      var list = local.map(function (p) {
        var localComments = getLocalComments(p.id);
        var additionalViews = typeof getPostViewCount === 'function' ? getPostViewCount(p.id) : 0;
        return {
          id: p.id,
          title: p.title,
          author: p.author,
          board: p.board || 'free',
          hits: (p.hits != null ? p.hits : 0) + additionalViews,
          verified: p.verified,
          notice: !!p.notice,
          commentCount: localComments.length,
          likeCount: getPostLikeCount(p.id),
          body: p.body,
          createdAt: p.createdAt
        };
      });
      finish(list);
    },
    getPostById: function (postId, callback) {
      if (!postId || !callback) return;
      var called = false;
      function done(err, post) {
        if (called) return;
        called = true;
        callback(err, post);
      }
      if (db) {
        var ref = db.collection('posts').doc(postId);
        ref.get().then(function (doc) {
          if (doc.exists) {
            try {
              done(null, firestoreDocToPost(doc));
            } catch (e) {
              console.warn('[app.js getPostById] doc 변환 실패', postId, e);
              done(null, getLocalPostById(postId));
            }
          } else {
            done(null, getLocalPostById(postId));
          }
        }).catch(function (e) {
          console.error('[app.js getPostById] Firestore get 실패', postId, e);
          done(null, getLocalPostById(postId));
        });
        setTimeout(function () {
          if (!called) done(null, null);
        }, 12000);
        return;
      }
      done(null, getLocalPostById(postId));
    },
    deleteAllCommunityPosts: function (callback) {
      if (!callback) return;
      if (!isOperator()) {
        callback('운영자만 실행할 수 있어요.');
        return;
      }
      function clearLocal() {
        try {
          saveLocalPosts([]);
          var keys = [];
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && (k.indexOf(COMMENTS_STORAGE_PREFIX) === 0 || k === LIKES_STORAGE_KEY || k === LIKED_POSTS_KEY || k === POST_VIEWS_KEY || k === LAST_VIEWED_KEY)) keys.push(k);
          }
          keys.forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
      }
      if (!db) {
        clearLocal();
        callback(null);
        return;
      }
      db.collection('posts').get().then(function (snap) {
        var refs = [];
        snap.forEach(function (doc) { refs.push(doc.ref); });
        var BATCH_SIZE = 500;
        var chain = Promise.resolve();
        for (var i = 0; i < refs.length; i += BATCH_SIZE) {
          (function (batch) {
            chain = chain.then(function () { return batch.commit(); });
          })((function () {
            var b = db.batch();
            refs.slice(i, i + BATCH_SIZE).forEach(function (ref) { b.delete(ref); });
            return b;
          })());
        }
        return chain;
      }).then(function () {
        clearLocal();
        callback(null);
      }).catch(function (err) {
        callback(err && err.message ? err.message : '삭제 중 오류가 났어요.');
      });
    },
    getPostLikeCount: getPostLikeCount,
    hasUserLikedPost: hasUserLikedPost,
    getUserLikedState: function (postId, callback) {
      if (!postId || !callback) return;
      var u = getUser();
      var anonId = localStorage.getItem('merchant_plus_anon_id');
      var userId = (u && u.uid) ? u.uid : (anonId || '');
      if (db && String(postId).indexOf('local_') !== 0 && userId) {
        db.collection('posts').doc(postId).collection('likes').doc(userId).get()
          .then(function (doc) {
            var liked = doc.exists;
            if (liked) {
              var arr = getLikedPosts();
              if (arr.indexOf(String(postId)) === -1) setLikedPosts(arr.concat(String(postId)));
              setPostLike(postId, 1);
            }
            callback(liked);
          })
          .catch(function () { callback(hasUserLikedPost(postId)); });
      } else {
        callback(hasUserLikedPost(postId));
      }
    },
    setPostLike: setPostLike,
    togglePostLike: togglePostLike,

    getPostsByIds: function (ids, callback) {
      if (!ids || !ids.length) { if (callback) callback(null, []); return; }
      var self = this;
      this.fetchPosts('all', 500, 0, function (err, list) {
        if (err || !list) { if (callback) callback(null, []); return; }
        var idSet = {};
        ids.forEach(function (id) { idSet[id] = true; });
        var byId = {};
        list.forEach(function (p) { if (idSet[p.id]) byId[p.id] = p; });
        var ordered = ids.map(function (id) { return byId[id]; }).filter(Boolean);
        if (callback) callback(null, ordered);
      }, 'latest');
    },

    getRelatedPosts: function (postId, limit, callback) {
      var self = this;
      this.getPostById(postId, function (err, post) {
        if (!post) { if (callback) callback(null, []); return; }
        var board = post.board || 'free';
        self.fetchPosts(board, 100, 0, function (err, list) {
          if (err || !list) { if (callback) callback(null, []); return; }
          var related = list
            .filter(function (p) { return p.id !== postId; })
            .slice(0, limit || 5);
          if (callback) callback(null, related);
        }, 'latest');
      });
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
      function firstImageUrl(body) {
        if (!body) return null;
        var m = body.match(/<img[^>]+src=["']([^"']+)["']/i) || body.match(/(https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp))/i);
        return m ? m[1] : null;
      }
      el.innerHTML = (list || []).map(function (p) {
        var href = base + (p.id || '');
        var board = p.board || 'free';
        var badge = showBoardBadge ? '<span class="feed-board-badge">' + (boardLabels[board] || board) + '</span>' : '';
        var noticeBadge = p.notice ? '<span class="notice-badge">공지</span>' : '';
        var verified = (p.verified === true || isAuthorVerified(p.author)) ? verifiedBadgeHtml(true, p.author) : '';
        var likeStr = (p.likeCount != null && p.likeCount > 0) ? ' · 👍 ' + p.likeCount : '';
        var dateStr = (p.createdAt ? formatRelativeDate(new Date(p.createdAt)) : '') || (p.date || '');
        var meta = (p.author ? p.author + ' · ' : '') + dateStr + (p.hits != null ? ' · 조회 ' + p.hits : '') + likeStr + verified;
        var commentCount = p.commentCount || 0;
        var commentBadge = commentCount > 0 ? '<span class="comment-count-badge">' + commentCount + '</span>' : '';
        var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn btn btn-outline btn-sm" data-post-id="' + (p.id || '').replace(/"/g, '&quot;') + '">' + (p.notice ? '공지 해제' : '공지') + '</button>' : '';
        var thumbUrl = firstImageUrl(p.body);
        var thumbHtml = thumbUrl ? '<span class="feed-item-thumb"><img src="' + thumbUrl.replace(/"/g, '&quot;') + '" alt="" width="56" height="56" loading="lazy"></span>' : '';
        return '<li class="feed-item feed-item-row">' +
          '<a href="' + href + '" class="feed-title-wrapper">' +
            '<span class="feed-title-content feed-title-row">' + noticeBadge + badge + '<span class="feed-title-text">' + (p.title || '') + '</span></span>' +
            commentBadge +
          '</a>' +
          (thumbHtml ? thumbHtml : '') +
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
      var onReply = opts.onReply || null;
      if (!list || list.length === 0) {
        el.innerHTML = '<li class="comment-empty">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</li>';
        return;
      }
      var topLevel = list.filter(function (c) { return !c.parentId; });
      var byParent = {};
      list.forEach(function (c) {
        if (c.parentId) {
          if (!byParent[c.parentId]) byParent[c.parentId] = [];
          byParent[c.parentId].push(c);
        }
      });
      function renderOne(c, isReply) {
        var verified = (c.verified === true || isAuthorVerified(c.author)) ? verifiedBadgeHtml(true, c.author) : '';
        var commentDateStr = (c.createdAt ? formatRelativeDate(new Date(c.createdAt)) : '') || (c.date || '');
        var metaText = '<span class="comment-meta-info">' + (c.author || '익명') + verified + ' · ' + commentDateStr + '</span>';
        var delBtn = canDelete ? '<button type="button" class="comment-delete-btn" data-post-id="' + (postId || '').replace(/"/g, '&quot;') + '" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '" aria-label="댓글 삭제">삭제</button>' : '';
        var replyBtn = onReply ? '<button type="button" class="comment-reply-btn" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '" aria-label="답글">답글</button>' : '';
        var bodyHtml = (c.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        var replyClass = isReply ? ' comment-item-reply' : '';
        var html = '<li class="comment-item' + replyClass + '" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '"><div class="comment-meta">' + metaText + ' ' + replyBtn + delBtn + '</div><div class="comment-body">' + bodyHtml + '</div></li>';
        var replies = (byParent[c.id] || []).sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
        replies.forEach(function (r) { html += renderOne(r, true); });
        return html;
      }
      el.innerHTML = topLevel.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); }).map(function (c) { return renderOne(c, false); }).join('');
    },
    isAuthorVerified: isAuthorVerified,
    verifiedBadgeHtml: verifiedBadgeHtml,
    uploadImageToStorage: uploadImageToStorage,

    createPost: function (data, callback) {
      var u = getUser();
      function saveToFirestore() {
        if (!db) return false;
        var payload = {
          title: data.title || '',
          body: data.body || '',
          author: data.author || '익명',
          authorId: u ? u.uid : null,
          board: data.board || 'free',
          createdAt: new Date().toISOString(),
          notice: !!(data.notice),
          industry: data.industry || '',
          monthlyVolume: data.monthlyVolume || '',
          pgUsed: data.pgUsed || '',
          hits: 0,
          likeCount: 0,
          commentCount: 0,
          verified: false
        };
        db.collection('posts').add(payload).then(function (ref) {
          if (callback) callback(null, { id: ref.id, title: payload.title, body: payload.body, author: payload.author, authorId: payload.authorId, board: payload.board, createdAt: payload.createdAt, notice: payload.notice, industry: payload.industry, monthlyVolume: payload.monthlyVolume, pgUsed: payload.pgUsed, hits: 0, verified: false });
        }).catch(function (err) {
          if (callback) callback(err && err.message ? err.message : 'Firestore 저장에 실패했어요.');
        });
        return true;
      }
      function fallbackLocal() {
        try {
          var post = addLocalPost({ title: data.title, body: data.body, author: data.author, board: data.board, notice: data.notice, authorId: u ? u.uid : null, industry: data.industry, monthlyVolume: data.monthlyVolume, pgUsed: data.pgUsed });
          if (callback) callback(null, post);
        } catch (e) {
          if (callback) callback(e && e.message ? e.message : '글 등록에 실패했어요.');
        }
      }
      function tryApi() {
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
            board: data.board || 'free',
            industry: data.industry || '',
            monthlyVolume: data.monthlyVolume || '',
            pgUsed: data.pgUsed || ''
          })
        }).then(function (res) {
          if (!res.ok) throw new Error('API failed');
          return res.json();
        }).then(function (result) {
          if (result && result.id) {
            if (callback) callback(null, result);
          } else if (callback) callback(result && (result.error || result.message) ? (result.error || result.message) : '등록 실패');
        }).catch(function () {
          fallbackLocal();
        });
      }
      if (db) {
        saveToFirestore();
      } else {
        tryApi();
      }
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
