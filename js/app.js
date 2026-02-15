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

  var MOCK_NEWS = [
    { id: '1', title: '2025년 PG사 수수료 인하 동향, 가맹점 부담 완화 기대', link: 'news.html', date: '2025-02-11', badge: '뉴스', source: '가맹점숲', body: '정부가 소상공인·영세 가맹점 결제 부담을 줄이기 위해 2025년 카드수수료 환급제를 운영 중입니다. 영세가맹점(연매출 3억 원 이하) 0.8% 환급·연 최대 150만 원, 중소가맹점(연매출 30억 원 이하) 0.5% 환급·연 최대 100만 원을 소상공인마당(www.sbiz.or.kr/sup/)에서 신청할 수 있습니다. PG사별 일반·영세·중소 우대 수수료는 국세청 연매출 기준으로 적용되므로, 계약 갱신 시 PG사에 문의해 보시는 것이 좋습니다.\n\n실제 적용 시점과 조건은 PG사·카드사·공단 정책에 따라 달라질 수 있으니, 공지와 공식 안내를 수시로 확인하세요.' },
    { id: '2', title: '온라인 쇼핑몰 전자상거래법 요약 (가맹점주 필독)', link: 'news.html', date: '2025-02-10', badge: '정책', source: '가맹점숲', body: '「전자상거래 등에서의 소비자보호에 관한 법률」은 온라인 쇼핑몰 운영 시 반드시 지켜야 할 사항을 담고 있습니다. 가맹점주가 꼭 숙지할 내용은 다음과 같습니다.\n\n· 표시의무: 사업자 정보, 재화·용역 정보, 청약철회 등 반드시 명시\n· 청약철회: 계약내용 서면을 받은 날(또는 재화 공급받은 날)부터 7일 이내 철회 가능하도록 안내. 디지털 콘텐츠 등 법정 예외 품목은 예외 사유 명시\n· 소비자 분쟁: 분쟁 해결 절차와 연락처 게시\n\n개정 시마다 추가·변경되는 의무가 있으니 공식 법령과 정부 고시를 확인하세요.' },
    { id: '3', title: '2025 소상공인 카드수수료 환급 신청 방법 안내', link: 'news.html', date: '2025-02-09', badge: '지원', source: '가맹점숲', body: '2025년 정부가 운영하는 소상공인 카드수수료 환급제는 연매출 50억 원 이하 소상공인을 대상으로 합니다. 영세가맹점(연매출 3억 원 이하)은 0.8% 환급·연 최대 150만 원, 중소가맹점(연매출 30억 원 이하)은 0.5% 환급·연 최대 100만 원을 지원받을 수 있습니다.\n\n신청은 소상공인마당(www.sbiz.or.kr/sup/)에서 온라인으로 하거나 카드사를 통해 자동 환급받을 수 있습니다. 국내 사업자등록증 보유·카드 단말기 결제 매출 존재·국세·지방세 체납 없음 등 요건을 확인하세요. 신청 기간·필요 서류는 공단·카드사 공지를 확인하세요.' },
    { id: '4', title: '쇼핑몰 해킹·사기 피해 예방 가이드 (결제 보안)', link: 'news.html', date: '2025-02-08', badge: '가이드', source: '가맹점숲', body: '온라인 쇼핑몰은 결제·개인정보를 다루기 때문에 보안이 필수입니다.\n\n· SSL(HTTPS): 결제·로그인 페이지는 반드시 SSL 적용\n· PG 연동: PG사가 제공하는 공식 연동 가이드와 인증 방식 준수\n· 관리자 계정: 기본 비밀번호 변경, 2단계 인증 적용\n· 정기 점검: 결제·주문 로그 확인, 이상 거래 모니터링\n\nPCI-DSS는 카드 정보를 직접 저장·처리할 때 요구되는 보안 기준입니다. 대부분의 중소 쇼핑몰은 PG사 페이지에서 결제를 처리하므로 카드 정보를 직접 보관하지 않으면 PCI-DSS 인증 범위가 줄어듭니다. 자세한 요건은 PG사와 보안 전문가에게 문의하세요.' },
    { id: '5', title: '토스페이먼츠·이니시스 등 PG사 연매출별 수수료 비교 (영세·중소)', link: 'pg.html', date: '2025-02-07', badge: '뉴스', source: '가맹점숲' },
    { id: '6', title: '전자세금계산서·현금영수증 의무 발행 가맹점 체크리스트', link: 'must-know.html#tax', date: '2025-02-06', badge: '가이드', source: '가맹점숲' },
    { id: '7', title: '쇼핑몰 정산 주기 D+3·D+5·D+7 차이와 PG사별 정산일', link: 'pg.html', date: '2025-02-05', badge: '정보', source: '가맹점숲' },
    { id: '8', title: '온라인 쇼핑몰 개인정보처리방침·이용약관 필수 게시 항목', link: 'must-know.html#privacy', date: '2025-02-04', badge: '정책', source: '가맹점숲' }
  ];

  var MOCK_POSTS = [
    { id: '1', title: 'PG사 토스 vs 이니시스 vs 나이스 수수료 비교 후기 있어요', author: '가맹점주', date: '2시간 전', hits: 42, board: 'fee', body: '', verified: false },
    { id: '2', title: '쇼핑몰 오픈 3개월 차, 정산 일정 D+5면 괜찮을까요?', author: '초보사장', date: '5시간 전', hits: 28, board: 'qna', verified: false },
    { id: '3', title: '전자세금계산서 자동 발행 연동 PG 추천 부탁드려요', author: '회원', date: '어제', hits: 15, board: 'qna', verified: false },
    { id: '4', title: '결제 오류 시 PG사 대응 팁 공유합니다', author: '운영자', date: '2일 전', hits: 89, board: 'info', verified: true },
    { id: '5', title: '영세사업자 수수료 우대 받은 분 계신가요?', author: '가맹점주', date: '3일 전', hits: 56, board: 'fee', body: '', verified: false }
  ];

  var MOCK_COMMENTS = {
    '1': [{ id: 'c1', author: '가맹점주', date: '1시간 전', body: '저도 토스 쓰는데 연회비 11만원에 카드 수수료 3.4%라 부담돼요. 이니시스 연회비 면제인 거 보고 바꿀까 고민 중.', verified: false }],
    '4': [{ id: 'c4', author: '운영자', date: '1일 전', body: 'PG사 고객센터 연락 시 거래일시·주문번호를 알려주시면 빠르게 조회됩니다.', verified: true }]
  };
  var COMMENTS_STORAGE_PREFIX = 'merchant_plus_comments_';
  var VERIFIED_AUTHORS = { '운영자': true };
  var OPERATOR_EMAIL = 'leesk0130@point3.team';

  var STORAGE_KEY = 'merchant_plus_posts';

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
    var post = {
      id: id,
      title: data.title || '',
      body: data.body || '',
      author: data.author || '익명',
      date: formatRelativeDate(new Date()),
      board: data.board || 'free',
      hits: 0,
      verified: false,
      createdAt: new Date().toISOString()
    };
    list.unshift(post);
    saveLocalPosts(list);
    return post;
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

  function showToast(message, type) {
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
    toast.textContent = message || '잠시 후 다시 시도해 주세요.';
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
      fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (data) {
          callback(null, data.items || data, data.total);
        })
        .catch(function () {
          callback(null, MOCK_NEWS.slice(0, limit || 10), MOCK_NEWS.length);
        });
    },

    fetchPosts: function (board, limit, offset, callback) {
      var url = BASE('api/community/posts') + '?board=' + (board || 'all') + '&limit=' + (limit || 20) + '&offset=' + (offset || 0);
      fetch(url).then(function (res) { return res.ok ? res.json() : Promise.reject(); })
        .then(function (data) {
          callback(null, data.items || data, data.total);
        })
        .catch(function () {
          var local = getLocalPosts();
          var mock = MOCK_POSTS.map(function (p) { return { id: p.id, title: p.title, author: p.author, date: p.date, board: p.board || 'free', hits: p.hits, verified: p.verified }; });
          var combined = local.map(function (p) { return { id: p.id, title: p.title, author: p.author, date: p.date, board: p.board || 'free', hits: p.hits != null ? p.hits : 0, body: p.body, verified: p.verified }; }).concat(mock);
          var filtered = (board && board !== 'all') ? combined.filter(function (p) { return p.board === board; }) : combined;
          callback(null, filtered.slice(0, limit || 20), filtered.length);
        });
    },

    getLocalPosts: getLocalPosts,
    addLocalPost: addLocalPost,
    getLocalPostById: getLocalPostById,

    getNewsById: function (id) {
      var list = MOCK_NEWS.filter(function (n) { return n.id === id; });
      return list[0] || null;
    },

    renderNews: function (containerId, list, linkPrefix) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var prefix = linkPrefix || '';
      el.innerHTML = (list || []).map(function (n) {
        var rawLink = n.link || '#';
        if (n.id && (rawLink === 'news.html' || rawLink.indexOf('news.html') === 0)) rawLink = 'news.html?id=' + n.id;
        var link = rawLink.indexOf('http') === 0 ? rawLink : (prefix + rawLink);
        var external = rawLink.indexOf('http') === 0;
        var targetAttr = external ? ' target="_blank" rel="noopener"' : '';
        var badge = n.badge ? '<span class="news-badge">' + n.badge + '</span>' : '';
        return '<li class="news-item"><a href="' + link + '"' + targetAttr + '><span class="news-title">' + (n.title || '') + '</span>' + badge + '<div class="news-meta">' + (n.date || '') + (n.source ? ' · ' + n.source : '') + '</div></a></li>';
      }).join('');
    },

    renderPosts: function (containerId, list, detailUrl, showBoardBadge) {
      var el = document.getElementById(containerId);
      if (!el) return;
      var base = detailUrl || 'community.html?id=';
      var boardLabels = { free: '자유', fee: '수수료/정산', qna: '질문답변', info: '정보공유' };
      el.innerHTML = (list || []).map(function (p) {
        var href = base + (p.id || '');
        var board = p.board || 'free';
        var badge = showBoardBadge ? '<span class="feed-board-badge">' + (boardLabels[board] || board) + '</span>' : '';
        var verified = (p.verified === true || isAuthorVerified(p.author)) ? verifiedBadgeHtml(true, p.author) : '';
        var meta = (p.author ? p.author + ' · ' : '') + (p.date || '') + (p.hits != null ? ' · 조회 ' + p.hits : '') + verified;
        return '<li class="feed-item"><a href="' + href + '" class="feed-title">' + badge + (p.title || '') + '</a><span class="feed-meta">' + meta + '</span></li>';
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
          var post = addLocalPost(data);
          if (callback) callback(null, post);
        });
    },

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

    showToast: showToast
  };
})();
