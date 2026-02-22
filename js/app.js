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
            var name = (user.email === OPERATOR_EMAIL) ? '???' : (user.displayName || user.email || '');
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
    var config = window.FIREBASE_CONFIG;
    console.log('[app.js] config 확인: config.js에서 FIREBASE_CONFIG 읽음, projectId=', config && config.projectId);
    var hasFirebase = !!(window.firebase && typeof window.firebase.firestore === 'function');
    if (config && hasFirebase) {
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.firestore();
      console.log('[app.js] Firestore 연결됨. db.collection("posts") 사용 가능.');
    }
    if (!db) {
      console.warn('[app.js] Firestore 미연결. config.js 확인: FIREBASE_CONFIG=', !!config, ', projectId=', config && config.projectId, ', firebase.firestore=', hasFirebase);
    }
  } catch (e) {
    db = null;
    console.error('[app.js] Firestore 초기화 예외', e);
  }

  // 2026? ?? ??? ?? (2026.02.14 ?? ??)
  var FEE_2026 = {
    CARD_YOUNG: 0.40,
    CARD_MID_1: 1.00,
    CARD_MID_2: 1.15,
    CARD_MID_3: 1.45,
    CASH_TRANSFER: 1.8,
    VIRTUAL_ACCOUNT: 300
  };
  var MERCHANT_FEE_2026 = FEE_2026;

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
      author: d.author || '??',
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

  // ??? API(GET /api/news)??? ??. ????/?? ??.

  // ???? ? ?? ?? ? ?? ?? ??
  var MOCK_POSTS = [];
  var MOCK_COMMENTS = {};
  var COMMENTS_STORAGE_PREFIX = 'merchant_plus_comments_';
  var VERIFIED_AUTHORS = { '???': true };
  var OPERATOR_EMAIL = 'leesk0130@point3.team';

  function canEditPost(post) {
    if (!post) return false;
    var u = getUser();
    if (!u || !u.uid) return false;
    if (isOperator()) return true;
    return post.authorId === u.uid;
  }

  function deletePost(postId, callback) {
    if (!db) {
      if (callback) callback('데이터베이스에 연결되어 있지 않아요.');
      return;
    }
    db.collection('posts').doc(postId).get().then(function (doc) {
      var post = doc.exists ? firestoreDocToPost(doc) : null;
      if (!post) { if (callback) callback('글이 없어요.'); return; }
      if (!canEditPost(post)) { if (callback) callback('수정 권한이 없어요.'); return; }
      db.collection('posts').doc(postId).delete().then(function () { if (callback) callback(null); }).catch(function (e) {
        if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '삭제에 실패했어요.');
      });
    }).catch(function (e) {
      if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '글이 없어요.');
    });
  }

  function updatePost(postId, data, callback) {
    if (!db) {
      if (callback) callback('데이터베이스에 연결되어 있지 않아요.');
      return;
    }
    db.collection('posts').doc(postId).get().then(function (doc) {
      var post = doc.exists ? firestoreDocToPost(doc) : null;
      if (!post) { if (callback) callback('글이 없어요.'); return; }
      if (!canEditPost(post)) { if (callback) callback('수정 권한이 없어요.'); return; }
      var upd = {};
      if (data.title != null) upd.title = data.title;
      if (data.body != null) upd.body = data.body;
      if (data.board != null) upd.board = data.board;
      if (Object.keys(upd).length === 0) { if (callback) callback(null, post); return; }
      db.collection('posts').doc(postId).update(upd).then(function () {
        if (callback) callback(null, Object.assign({}, post, upd));
      }).catch(function (e) {
        if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '수정에 실패했어요.');
      });
    }).catch(function (e) {
      if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '글이 없어요.');
    });
  }

  function togglePostNotice(postId, callback) {
    if (!db) {
      if (callback) callback('데이터베이스에 연결되어 있지 않아요.');
      return;
    }
    db.collection('posts').doc(postId).get().then(function (doc) {
      if (!doc.exists) { if (callback) callback('글이 없어요.'); return; }
      var notice = !doc.data().notice;
      db.collection('posts').doc(postId).update({ notice: notice }).then(function () {
        if (callback) callback(null);
      }).catch(function (e) {
        if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '반영에 실패했어요.');
      });
    }).catch(function () { if (callback) callback('글이 없어요.'); });
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
    if (!db || !postId) {
      if (callback) callback(null, []);
      return;
    }
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
            author: d.author || '??',
            body: d.body || '',
            parentId: d.parentId || null,
            verified: !!d.verified,
            createdAt: createdAt || ''
          });
        });
        list.sort(function (a, b) { return commentSortKey(a) - commentSortKey(b); });
        if (callback) callback(null, list);
      })
      .catch(function () {
        if (callback) callback(null, []);
      });
  }
  function addLocalComment(postId, data) {
    var list = getLocalComments(postId);
    var id = 'comment_' + Date.now();
    var comment = {
      id: id,
      parentId: data.parentId || null,
      author: data.author || '??',
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
    if (!db || !postId || !commentId) {
      if (callback) callback();
      return;
    }
    db.collection('posts').doc(postId).collection('comments').doc(commentId).delete().then(function () {
      var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
      if (inc) db.collection('posts').doc(postId).update({ commentCount: inc(-1) }).catch(function () {});
      if (callback) callback();
    }).catch(function () {
      if (callback) callback();
    });
  }
  function isOperator() {
    var u = getUser();
    if (!u) return false;
    if (u.name === '???') return true;
    var em = (u.email || '').toString().toLowerCase().trim();
    return em === OPERATOR_EMAIL.toLowerCase();
  }
  function addComment(postId, data, callback) {
    if (!db || !postId) {
      if (callback) callback('데이터베이스에 연결되어 있지 않아요.');
      return;
    }
    var payload = {
      author: data.author || '??',
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
    }).catch(function (e) {
      if (callback) callback(e && (e.message || e.code) ? String(e.message || e.code) : '댓글 저장에 실패했어요.');
    });
  }
  function togglePostLike(postId, callback) {
    if (!db) {
      if (callback) callback(null, 0);
      return;
    }
    var userId = (getUser() && getUser().uid) || localStorage.getItem('merchant_plus_anon_id') || '';
    if (!userId) {
      if (callback) callback(null, 0);
      return;
    }
    var likeRef = db.collection('posts').doc(postId).collection('likes').doc(userId);
    likeRef.get().then(function (doc) {
      var ref = db.collection('posts').doc(postId);
      var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
      if (doc.exists) {
        return likeRef.delete().then(function () {
          if (inc) return ref.update({ likeCount: inc(-1) }).then(function () { return -1; });
          return -1;
        });
      }
      return likeRef.set({ at: firebase.firestore.FieldValue.serverTimestamp() }).then(function () {
        if (inc) return ref.update({ likeCount: inc(1) }).then(function () { return 1; });
        return 1;
      });
    }).then(function () {
      return db.collection('posts').doc(postId).get().then(function (doc) {
        var newCount = doc.exists ? (doc.data().likeCount || 0) : 0;
        if (callback) callback(null, newCount);
      });
    }).catch(function (err) {
      if (callback) callback(err && err.message ? err.message : '좋아요 반영에 실패했어요.');
    });
  }
  function uploadImageToStorage(file, callback) {
    if (!window.firebase || !window.firebase.storage) {
      if (callback) callback('??? ??? ??? ????? Firebase Storage? ?????.');
      return;
    }
    try {
      var storage = firebase.storage();
      var ref = storage.ref('community/' + Date.now() + '_' + Math.random().toString(36).slice(2) + (file.name ? '_' + file.name.replace(/[^a-zA-Z0-9.-]/g, '') : ''));
      ref.put(file).then(function () {
        ref.getDownloadURL().then(function (url) {
          if (callback) callback(null, url);
        }).catch(function (err) {
          if (callback) callback(err && err.message ? err.message : 'URL? ???? ????.');
        });
      }).catch(function (err) {
        if (callback) callback(err && err.message ? err.message : '???? ?????.');
      });
    } catch (e) {
      if (callback) callback(e && e.message ? e.message : '??? ? ??? ???.');
    }
  }
  function isAuthorVerified(author) { return VERIFIED_AUTHORS[author] === true; }
  function verifiedBadgeHtml(verified, author) {
    if (!verified) return '';
    if (author === '???') return ' <span class="operator-badge" aria-label="???">???</span>';
    return ' <span class="verified-badge" aria-label="??? ??">??</span>';
  }

  function formatRelativeDate(d) {
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '?? ?';
    if (diff < 3600000) return Math.floor(diff / 60000) + '? ?';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '?? ?';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '? ?';
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getToken() {
    return localStorage.getItem('token');
  }
  function setToken(t) {
    if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
  }
  function setUser(u) {
    if (u && u.email === OPERATOR_EMAIL) { u = Object.assign({}, u, { name: '???' }); }
    if (u) localStorage.setItem('user', JSON.stringify(u)); else localStorage.removeItem('user');
  }
  function getUser() {
    try {
      var u = localStorage.getItem('user');
      u = u ? JSON.parse(u) : null;
      if (u && u.email === OPERATOR_EMAIL) { u = Object.assign({}, u, { name: '???' }); }
      return u;
    } catch (e) { return null; }
  }

  function logout() {
    if (firebaseAuth) firebaseAuth.signOut();
    setToken(null);
    setUser(null);
  }

  function getUserIdOrAnonId() {
    var u = getUser();
    if (u && u.uid) return u.uid;
    var anon = localStorage.getItem('merchant_plus_anon_id');
    if (!anon) {
      anon = 'anon_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      try { localStorage.setItem('merchant_plus_anon_id', anon); } catch (e) {}
    }
    return anon;
  }

  var viewCooldown = {};
  var VIEW_COOLDOWN_MS = 5 * 60 * 1000;

  function incrementPostViews(postId) {
    if (!postId) return false;
    if (viewCooldown[postId] && (Date.now() - viewCooldown[postId]) < VIEW_COOLDOWN_MS) return false;
    viewCooldown[postId] = Date.now();
    if (!db) return true;
    var inc = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment;
    if (inc) db.collection('posts').doc(postId).update({ hits: inc(1) }).catch(function () {});
    return true;
  }

  function getPostViewCount(postId) {
    return 0;
  }

  function showToast(message, type) {
    var text = (message || '').toString().trim();
    if (text === '?? ? ?? ??? ???.' || text === '') return;
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

  var app = {
    FEE_2026: FEE_2026,
    MERCHANT_FEE_2026: MERCHANT_FEE_2026,
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
          callback(err && err.message ? err.message : '??? ???? ????.', [], 0);
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
        console.log('[app.js fetchPosts] Firestore db.collection("posts") 쿼리 실행');
        db.collection('posts').orderBy('createdAt', 'desc').get()
          .then(function (snap) {
            console.log('[app.js fetchPosts] Firestore 응답 문서 수=', snap.size, '(데이터가 실제로 들어있는지 확인)');
            if (snap.empty) {
              if (callback) callback(null, [], 0);
              return;
            }
            var list = [];
            try {
              snap.forEach(function (doc) {
                try {
                  var p = firestoreDocToPost(doc);
                  if (p) list.push(p);
                } catch (docErr) {
                  console.warn('[app.js fetchPosts] doc ?? ??, ???', doc.id, docErr);
                }
              });
            } catch (e) {
              console.error('[app.js fetchPosts] forEach ? ??', e);
            }
            finish(list);
          })
          .catch(function (e) {
            console.error('[app.js fetchPosts] Firestore get ??', e);
            if (callback) callback(null, [], 0);
          });
        return;
      }
      if (callback) callback(null, [], 0);
    },
    getPostById: function (postId, callback) {
      if (!callback) return;
      postId = (postId || '').toString().trim();
      if (!postId) {
        callback(null, null);
        return;
      }
      if (!db) {
        callback(null, null);
        return;
      }
      var called = false;
      function done(err, post) {
        if (called) return;
        called = true;
        if (timeoutId) clearTimeout(timeoutId);
        callback(err, post);
      }
      var timeoutId = setTimeout(function () {
        done(null, null);
      }, 12000);
      var ref = db.collection('posts').doc(postId);
      ref.get()
        .then(function (docSnap) {
          if (!docSnap || !docSnap.exists) {
            done(null, null);
            return;
          }
          var post = null;
          try {
            post = firestoreDocToPost(docSnap);
          } catch (e) {
            console.warn('[app.js getPostById] doc 변환 실패', postId, e);
          }
          done(null, post);
        })
        .catch(function (e) {
          console.error('[app.js getPostById] Firestore get 실패', postId, e);
          done(null, null);
        });
    },
    deleteAllCommunityPosts: function (callback) {
      if (!callback) return;
      if (!isOperator()) {
        callback('권한이 없어요.');
        return;
      }
      if (!db) {
        if (callback) callback('데이터베이스에 연결되어 있지 않아요.');
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
        if (callback) callback(null);
      }).catch(function (err) {
        if (callback) callback(err && err.message ? err.message : '삭제에 실패했어요.');
      });
    },
    getPostLikeCount: getPostLikeCount,
    hasUserLikedPost: hasUserLikedPost,
    getUserLikedState: function (postId, callback) {
      if (!postId || !callback) return;
      if (!db) {
        callback(false);
        return;
      }
      var u = getUser();
      var anonId = localStorage.getItem('merchant_plus_anon_id');
      var userId = (u && u.uid) ? u.uid : (anonId || '');
      if (!userId) {
        callback(false);
        return;
      }
      db.collection('posts').doc(postId).collection('likes').doc(userId).get()
        .then(function (doc) { callback(doc.exists); })
        .catch(function () { callback(false); });
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

    renderNews: function (containerId, list, linkPrefix) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var prefix = linkPrefix || '';
      var items = list || [];
      el.innerHTML = items.map(function (n) {
        var link = (n.id ? (prefix + 'news.html?id=' + n.id) : '#');
        var badge = (n.category || n.badge) ? '<span class="news-badge">' + (n.category || n.badge) + '</span>' : '';
        var date = n.date || (n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
        return '<li class="news-item"><a href="' + link + '"><span class="news-title">' + (n.title || '') + '</span>' + badge + '<div class="news-meta">' + date + ' ? ????</div></a></li>';
      }).join('');
    },

    renderPostsHTML: function (list, detailUrl, showBoardBadge) {
      var base = detailUrl || 'community.html?id=';
      var boardLabels = { free: '??', fee: '???/??', qna: '????', info: '????' };
      var isOp = isOperator();
      function firstImageUrl(body) {
        if (!body) return null;
        var m = body.match(/<img[^>]+src=["']([^"']+)["']/i) || body.match(/(https?:\/\/[^\s<>"']+\.(?:jpe?g|png|gif|webp))/i);
        return m ? m[1] : null;
      }
      return (list || []).map(function (p) {
        var href = base + (p.id || '');
        var board = p.board || 'free';
        var badge = showBoardBadge ? '<span class="feed-board-badge">' + (boardLabels[board] || board) + '</span>' : '';
        var noticeBadge = p.notice ? '<span class="notice-badge">??</span>' : '';
        var verified = (p.verified === true || isAuthorVerified(p.author)) ? verifiedBadgeHtml(true, p.author) : '';
        var likeStr = (p.likeCount != null && p.likeCount > 0) ? ' ? ?? ' + p.likeCount : '';
        var dateStr = (p.createdAt ? formatRelativeDate(new Date(p.createdAt)) : '') || (p.date || '');
        var meta = (p.author ? p.author + ' ? ' : '') + dateStr + (p.hits != null ? ' ? ?? ' + p.hits : '') + likeStr + verified;
        var commentCount = p.commentCount || 0;
        var commentBadge = commentCount > 0 ? '<span class="comment-count-badge">' + commentCount + '</span>' : '';
        var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn btn btn-outline btn-sm" data-post-id="' + (p.id || '').replace(/"/g, '&quot;') + '">' + (p.notice ? '?? ??' : '??') + '</button>' : '';
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

    renderPosts: function (containerId, list, detailUrl, showBoardBadge) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var base = detailUrl || 'community.html?id=';
      var boardLabels = { free: '??', fee: '???/??', qna: '????', info: '????' };
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
        var noticeBadge = p.notice ? '<span class="notice-badge">??</span>' : '';
        var verified = (p.verified === true || isAuthorVerified(p.author)) ? verifiedBadgeHtml(true, p.author) : '';
        var likeStr = (p.likeCount != null && p.likeCount > 0) ? ' ? ?? ' + p.likeCount : '';
        var dateStr = (p.createdAt ? formatRelativeDate(new Date(p.createdAt)) : '') || (p.date || '');
        var meta = (p.author ? p.author + ' ? ' : '') + dateStr + (p.hits != null ? ' ? ?? ' + p.hits : '') + likeStr + verified;
        var commentCount = p.commentCount || 0;
        var commentBadge = commentCount > 0 ? '<span class="comment-count-badge">' + commentCount + '</span>' : '';
        var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn btn btn-outline btn-sm" data-post-id="' + (p.id || '').replace(/"/g, '&quot;') + '">' + (p.notice ? '?? ??' : '??') + '</button>' : '';
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
        { id: '4', title: '?? ?? ? PG? ?? ? ?????', board: 'info', notice: true }
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
        el.innerHTML = '<li class="comment-empty">?? ??? ???. ? ??? ?? ???.</li>';
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
        var metaText = '<span class="comment-meta-info">' + (c.author || '??') + verified + ' ? ' + commentDateStr + '</span>';
        var delBtn = canDelete ? '<button type="button" class="comment-delete-btn" data-post-id="' + (postId || '').replace(/"/g, '&quot;') + '" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '" aria-label="?? ??">??</button>' : '';
        var replyBtn = onReply ? '<button type="button" class="comment-reply-btn" data-comment-id="' + (c.id || '').replace(/"/g, '&quot;') + '" aria-label="??">??</button>' : '';
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
      if (!db) {
        if (callback) callback('?????? ??? ??????. config.js? ?????.');
        return;
      }
      var u = getUser();
      var payload = {
        title: data.title || '',
        body: data.body || '',
        author: data.author || '??',
        authorId: u ? u.uid : null,
        board: data.board || 'free',
        notice: !!(data.notice),
        industry: data.industry || '',
        monthlyVolume: data.monthlyVolume || '',
        pgUsed: data.pgUsed || '',
        hits: 0,
        likeCount: 0,
        commentCount: 0,
        verified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      db.collection('posts').add(payload).then(function (ref) {
        console.log('Firestore 저장 성공');
        if (callback) callback(null, { id: ref.id });
      }).catch(function (err) {
        console.error('[app.js createPost] Firestore add 실패', err);
        var msg = (err && (err.message || err.code)) ? String(err.message || err.code) : 'Firestore 저장에 실패했어요.';
        if (callback) callback(msg);
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
            var msg = code === 'auth/user-not-found' ? '???? ?? ??????.' : code === 'auth/wrong-password' ? '????? ???.' : code === 'auth/invalid-email' ? '??? ??? ??? ???.' : code === 'auth/too-many-requests' ? '?? ? ?? ??? ???.' : code === 'auth/operation-not-allowed' ? '??? ???? ???? ????. Firebase ???? ???/???? ??? ? ???.' : code === 'auth/unauthorized-domain' ? '? ??? ???? Firebase ?? ??? ???. Firebase ?? ? Authentication ? ?? ? ??? ???? ? ??? ??? ???.' : (err.message || '??? ??');
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
          } else if (callback) callback(data.error || '??? ??');
        })
        .catch(function (err) {
          if (callback) callback('??? ??? ? ???. ??? ? ?? ??????.');
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
            var msg = code === 'auth/email-already-in-use' ? '?? ?? ?? ??????.' : code === 'auth/weak-password' ? '????? 6? ?????.' : code === 'auth/invalid-email' ? '??? ??? ??? ???.' : code === 'auth/operation-not-allowed' ? '??? ??? ???? ????. Firebase ???? ???/???? ??? ? ???.' : code === 'auth/unauthorized-domain' ? '? ??? ???? Firebase ?? ??? ???. Firebase ?? ? Authentication ? ?? ? ??? ???? ? ??? ??? ???.' : (err.message || '?? ??');
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
          } else if (callback) callback(data.error || '?? ??');
        })
        .catch(function () {
          if (callback) callback('??? ??? ? ???. ??? ? ?? ???????.');
        });
    },

    showToast: showToast,

    getBookmarkIds: function (callback) {
      if (!db || !callback) return;
      var uid = getUserIdOrAnonId();
      db.collection('bookmarks').doc(uid).get().then(function (doc) {
        var ids = (doc.exists && doc.data().postIds) ? doc.data().postIds : [];
        callback(null, Array.isArray(ids) ? ids : []);
      }).catch(function (e) { callback(e, []); });
    },
    addBookmark: function (postId, callback) {
      if (!db || !postId) { if (callback) callback('연결되지 않았어요.'); return; }
      var uid = getUserIdOrAnonId();
      var ref = db.collection('bookmarks').doc(uid);
      var arrUnion = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.arrayUnion;
      if (!arrUnion) { if (callback) callback(null); return; }
      ref.get().then(function (doc) {
        if (doc.exists && (doc.data().postIds || []).indexOf(postId) !== -1) { if (callback) callback(null); return; }
        return ref.set({ postIds: arrUnion(postId) }, { merge: true });
      }).then(function () { if (callback) callback(null); }).catch(function (e) { if (callback) callback(e && e.message ? e.message : '저장 실패'); });
    },
    removeBookmark: function (postId, callback) {
      if (!db || !postId) { if (callback) callback(null); return; }
      var uid = getUserIdOrAnonId();
      var ref = db.collection('bookmarks').doc(uid);
      var arrRemove = firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.arrayRemove;
      if (!arrRemove) { if (callback) callback(null); return; }
      ref.update({ postIds: arrRemove(postId) }).then(function () { if (callback) callback(null); }).catch(function () { if (callback) callback(null); });
    },
    toggleBookmark: function (postId, callback) {
      var self = this;
      this.getBookmarkIds(function (err, ids) {
        if (err) { if (callback) callback(err, false); return; }
        var isIn = ids.indexOf(postId) !== -1;
        if (isIn) self.removeBookmark(postId, function () { if (callback) callback(null, false); });
        else self.addBookmark(postId, function () { if (callback) callback(null, true); });
      });
    },
    isBookmarked: function (postId, callback) {
      this.getBookmarkIds(function (err, ids) {
        if (callback) callback(!!(ids && ids.indexOf(postId) !== -1));
      });
    },

    getDraft: function (callback) {
      if (!db || !callback) return;
      var uid = getUserIdOrAnonId();
      db.collection('drafts').doc(uid).get().then(function (doc) {
        callback(null, doc.exists ? doc.data() : null);
      }).catch(function (e) { callback(e, null); });
    },
    saveDraft: function (data, callback) {
      if (!db) { if (callback) callback('연결되지 않았어요.'); return; }
      var uid = getUserIdOrAnonId();
      var payload = Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      db.collection('drafts').doc(uid).set(payload, { merge: true }).then(function () { if (callback) callback(null); }).catch(function (e) { if (callback) callback(e && e.message ? e.message : '저장 실패'); });
    },
    clearDraft: function (callback) {
      if (!db) { if (callback) callback(null); return; }
      var uid = getUserIdOrAnonId();
      db.collection('drafts').doc(uid).delete().then(function () { if (callback) callback(null); }).catch(function () { if (callback) callback(null); });
    },

    getSavedCalculations: function (callback) {
      if (!db || !callback) return;
      var uid = getUserIdOrAnonId();
      db.collection('savedCalculations').where('userId', '==', uid).get().then(function (snap) {
        var list = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          var ts = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().getTime() : (d.createdAt && d.createdAt.seconds ? d.createdAt.seconds * 1000 : 0);
          list.push({ id: doc.id, name: d.name, params: d.params || {}, createdAt: ts });
        });
        list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        callback(null, list);
      }).catch(function (e) { callback(e, []); });
    },
    saveCalculation: function (item, callback) {
      if (!db) { if (callback) callback('연결되지 않았어요.'); return; }
      var uid = getUserIdOrAnonId();
      db.collection('savedCalculations').add({
        userId: uid,
        name: item.name || '저장 계산',
        params: item.params || {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function (ref) { if (callback) callback(null, ref.id); }).catch(function (e) { if (callback) callback(e && e.message ? e.message : '저장 실패'); });
    },
    deleteSavedCalculation: function (id, callback) {
      if (!db || !id) { if (callback) callback(null); return; }
      db.collection('savedCalculations').doc(id).delete().then(function () { if (callback) callback(null); }).catch(function () { if (callback) callback(null); });
    },
    getSavedCalculationById: function (id, callback) {
      if (!db || !id || !callback) return;
      db.collection('savedCalculations').doc(id).get().then(function (doc) {
        if (!doc.exists) { callback(null, null); return; }
        var d = doc.data();
        var ts = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().getTime() : (d.createdAt && d.createdAt.seconds ? d.createdAt.seconds * 1000 : 0);
        callback(null, { id: doc.id, name: d.name, params: d.params || {}, createdAt: ts });
      }).catch(function (e) { callback(e, null); });
    },

    incrementPostViews: incrementPostViews,
    getPostViewCount: getPostViewCount
  };

  if (typeof window !== 'undefined') {
    window.app = app;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = app;
  }
})();
