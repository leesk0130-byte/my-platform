/**
 * 커뮤니티 단일 상태 렌더 (viewState 1개만 DOM에 존재)
 * 규칙: loading | list | empty | detail | notFound | error → replaceChildren로 한 상태만 렌더, Fade-in 전환
 */
(function() {
  'use strict';

  var PAGE_SIZE = 20;
  var currentShown = 0;
  var allFilteredItems = [];
  var searchQuery = '';
  var sortBy = 'latest';

  function getBoardLabel(board) {
    var map = { free: '자유', fee: '수수료', qna: '질문', info: '정보' };
    return map[board] || '';
  }

  function buildTabsItems(active) {
    return [
      { value: 'all', label: '전체', href: 'community.html' },
      { value: 'free', label: '자유', href: 'community.html?board=free' },
      { value: 'fee', label: '수수료/정산', href: 'community.html?board=fee' },
      { value: 'qna', label: '질문답변', href: 'community.html?board=qna' },
      { value: 'info', label: '정보공유', href: 'community.html?board=info' }
    ];
  }

  function buildSidebarData(posts, notices) {
    var popular = (posts || []).slice().sort(function(a, b) {
      var sa = (a.hits || 0) + (a.commentCount || 0) * 3;
      var sb = (b.hits || 0) + (b.commentCount || 0) * 3;
      return sb - sa;
    }).slice(0, 5).map(function(p) {
      return { title: p.title, href: 'community.html?id=' + p.id, hits: p.hits || 0, commentCount: p.commentCount || 0 };
    });
    var noticeList = (notices || []).slice(0, 3).map(function(n) {
      return { title: n.title, href: 'community.html?id=' + n.id };
    });
    return {
      popular: popular,
      notices: noticeList,
      guide: { title: '✅ 인증 안내', body: '인증된 아이디로 더 신뢰할 수 있는 정보를 나누세요.', ctaHref: 'verify.html', ctaLabel: '자세히 보기' }
    };
  }

  function filterAndSort(items, query, sort) {
    var list = items || [];
    if (query) list = list.filter(function(p) { return (p.title || '').toLowerCase().indexOf(query.toLowerCase()) >= 0; });
    if (sort === 'hits') list = list.slice().sort(function(a, b) { return (b.hits || 0) - (a.hits || 0); });
    else if (sort === 'comments') list = list.slice().sort(function(a, b) { return (b.commentCount || 0) - (a.commentCount || 0); });
    else list = list.slice().sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    return list;
  }

  function renderPage(state, data) {
    var root = document.getElementById('page-root');
    if (!root) return;

    var C = window.Components;
    if (!C) return;

    var board = (new URLSearchParams(location.search)).get('board') || 'all';
    var tabsHtml = C.Tabs({ items: buildTabsItems(board), active: board, baseUrl: 'community.html' });
    var toolbarHtml = '<div class="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100">' +
      '<div class="flex-1 flex gap-2 min-w-0">' +
        (C.Input({ id: 'board-search-input', placeholder: '제목으로 검색', value: searchQuery, className: 'max-w-xs' })) +
        '<button type="button" id="board-search-btn" class="shrink-0 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-[15px] hover:bg-slate-50">검색</button>' +
      '</div>' +
      '<select id="board-sort-select" class="px-3 py-2 border border-slate-200 rounded-xl text-[15px]">' +
        '<option value="latest"' + (sortBy === 'latest' ? ' selected' : '') + '>최신순</option>' +
        '<option value="hits"' + (sortBy === 'hits' ? ' selected' : '') + '>조회순</option>' +
        '<option value="comments"' + (sortBy === 'comments' ? ' selected' : '') + '>댓글순</option>' +
      '</select>' +
      '<a href="write.html" class="shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700">글쓰기</a>' +
    '</div>';

    var cardBody = '';
    var sidebarData = null;

    switch (state) {
      case 'loading':
        cardBody = tabsHtml + toolbarHtml + C.Skeleton({ lines: 6 });
        break;
      case 'list':
        var list = data || [];
        var show = list.slice(0, currentShown || PAGE_SIZE);
        var isOp = window.app && window.app.isOperator && window.app.isOperator();
        var listItems = show.map(function(p) {
          var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn px-2 py-1 text-xs font-medium rounded border border-slate-300 hover:bg-slate-100" data-post-id="' + (p.id || '') + '">' + (p.notice ? '공지 해제' : '공지') + '</button>' : '';
          return C.ListItem({
            href: 'community.html?id=' + p.id,
            title: p.title,
            meta: (p.nickname || p.author || '익명') + ' · ' + (p.date || p.createdAt || '') + ' · 조회 ' + (p.hits || 0),
            commentCount: p.commentCount != null ? p.commentCount : 0,
            categoryLabel: getBoardLabel(p.board),
            noticeBadge: !!p.notice,
            operatorActions: noticeBtn
          });
        }).join('');
        var moreHtml = list.length > currentShown
          ? '<div class="p-4 border-t border-slate-100"><button type="button" id="posts-more-btn" class="w-full py-3 border border-slate-200 rounded-xl font-semibold text-[15px] hover:bg-slate-50">더보기</button></div>'
          : '';
        cardBody = tabsHtml + toolbarHtml + '<ul class="divide-y divide-slate-100">' + listItems + '</ul>' + moreHtml;
        var noticePosts = list.filter(function(p) { return !!p.notice; });
        sidebarData = buildSidebarData(list, noticePosts);
        break;
      case 'empty':
        cardBody = tabsHtml + toolbarHtml + C.EmptyState({ title: '아직 작성된 글이 없어요!', ctaLabel: '첫 글 쓰기', ctaHref: 'write.html' });
        sidebarData = buildSidebarData([], []);
        break;
      case 'error':
        cardBody = tabsHtml + toolbarHtml + C.ErrorState({ desc: data || '잠시 후 다시 시도해 주세요.', retryId: 'error-retry-btn' });
        sidebarData = buildSidebarData([], []);
        break;
      case 'notFound':
        cardBody = C.NotFoundState({ backHref: 'community.html' });
        break;
      case 'detail':
        var post = data;
        if (!post) {
          cardBody = C.NotFoundState({ backHref: 'community.html' });
        } else {
          var canEdit = window.app && window.app.canEditPost && window.app.canEditPost(post);
          var editDeleteBtns = canEdit ? '<div class="flex gap-2 mt-4 mb-2"><a href="edit.html?id=' + (post.id || '').replace(/"/g, '&quot;') + '" class="btn btn-outline btn-sm">수정</a><button type="button" class="post-delete-btn btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50" data-post-id="' + (post.id || '').replace(/"/g, '&quot;') + '">삭제</button></div>' : '';
          var detailBody = (post.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          cardBody = '<div class="p-4 sm:p-6">' +
            '<a href="community.html" class="inline-flex items-center gap-2 text-[15px] font-semibold text-emerald-600 hover:underline mb-4">← 목록으로</a>' +
            '<h1 class="text-xl sm:text-2xl font-bold text-slate-800 leading-snug mb-2">' + (post.title || '제목 없음').replace(/</g, '&lt;') + '</h1>' +
            '<p class="text-xs text-slate-500 mb-4">' + (post.nickname || post.author || '익명') + ' · ' + (post.date || post.createdAt || '') + ' · 조회 ' + (post.hits || 0) + '</p>' +
            editDeleteBtns +
            '<div class="text-[15px] leading-relaxed text-slate-700 max-w-prose" style="margin-bottom: 1rem;">' + detailBody + '</div>' +
            '<section class="mt-8 pt-6 border-t border-slate-200">' +
              '<h2 class="text-lg font-semibold text-slate-800 mb-3">댓글 <span id="comment-count">' + (post.commentCount || 0) + '</span></h2>' +
              '<ul id="comment-list" class="space-y-2 mb-4"></ul>' +
              '<form id="comment-form" class="space-y-3">' +
                '<input type="text" id="comment-nickname" placeholder="닉네임 (선택)" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px]" maxlength="20">' +
                '<textarea id="comment-body" placeholder="댓글을 입력하세요" required rows="3" class="w-full px-4 py-3 border border-slate-200 rounded-xl text-[15px]"></textarea>' +
                '<div id="comment-error" class="text-sm text-red-600 hidden"></div>' +
                '<button type="submit" class="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700">댓글 등록</button>' +
              '</form>' +
            '</section></div>';
        }
        break;
      default:
        cardBody = tabsHtml + toolbarHtml + C.Skeleton({ lines: 6 });
    }

    var mainContent = C.Card({ children: cardBody });
    var sidebarHtml = sidebarData ? C.Sidebar(sidebarData) : '';

    var layoutHtml = sidebarHtml
      ? '<div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-4"><div class="min-w-0">' + mainContent + '</div><div class="lg:w-[280px]">' + sidebarHtml + '</div></div>'
      : '<div class="mt-4">' + mainContent + '</div>';

    var wrap = document.createElement('div');
    wrap.className = 'page-root-inner';
    wrap.style.animation = 'fadeIn 0.25s ease-out';
    wrap.innerHTML = layoutHtml;
    root.replaceChildren(wrap);
    root.className = 'page-root';

    attachListeners(state, data);
  }

  function attachListeners(state, data) {
    var params = new URLSearchParams(location.search);
    var postId = params.get('id');
    var board = params.get('board') || 'all';

    var searchBtn = document.getElementById('board-search-btn');
    if (searchBtn) {
      searchBtn.onclick = function() {
        var input = document.getElementById('board-search-input');
        if (input) { searchQuery = input.value.trim(); currentShown = 0; loadList(); }
      };
    }
    var sortSelect = document.getElementById('board-sort-select');
    if (sortSelect) {
      sortSelect.onchange = function() {
        sortBy = sortSelect.value;
        currentShown = 0;
        loadList();
      };
    }
    var moreBtn = document.getElementById('posts-more-btn');
    if (moreBtn) {
      moreBtn.onclick = function() {
        currentShown += PAGE_SIZE;
        renderPage('list', allFilteredItems);
      };
    }
    var retryBtn = document.getElementById('error-retry-btn');
    if (retryBtn) {
      retryBtn.onclick = function() {
        if (postId) loadDetail(postId);
        else loadList();
      };
    }
    var commentForm = document.getElementById('comment-form');
    if (commentForm && postId && window.app) {
      commentForm.onsubmit = function(e) {
        e.preventDefault();
        var body = document.getElementById('comment-body');
        var nickname = document.getElementById('comment-nickname');
        var errEl = document.getElementById('comment-error');
        var text = (body && body.value || '').trim();
        if (!text) {
          if (errEl) { errEl.textContent = '댓글 내용을 입력해 주세요.'; errEl.classList.remove('hidden'); }
          return;
        }
        window.app.addComment(postId, { author: (nickname && nickname.value) || '익명', body: text }, function(err) {
          if (err) {
            if (errEl) { errEl.textContent = err; errEl.classList.remove('hidden'); }
            return;
          }
          if (body) body.value = '';
          if (errEl) errEl.classList.add('hidden');
          window.app.getComments(postId, function(_, comments) {
            if (window.app.renderComments) window.app.renderComments('comment-list', comments, { postId: postId, canDelete: window.app.isOperator && window.app.isOperator() });
            var countEl = document.getElementById('comment-count');
            if (countEl) countEl.textContent = comments ? comments.length : 0;
          });
        });
      };
      window.app.getComments(postId, function(_, comments) {
        if (window.app.renderComments) window.app.renderComments('comment-list', comments, { postId: postId, canDelete: window.app.isOperator && window.app.isOperator() });
        var countEl = document.getElementById('comment-count');
        if (countEl) countEl.textContent = comments ? comments.length : 0;
      });
    }
  }

  function loadList() {
    renderPage('loading');
    var board = (new URLSearchParams(location.search)).get('board') || 'all';
    if (!window.app || !window.app.fetchPosts) return renderPage('error', '앱을 불러올 수 없습니다.');
    window.app.fetchPosts(board, 500, 0, function(err, items) {
      if (err) return renderPage('error', err);
      allFilteredItems = filterAndSort(items || [], searchQuery, sortBy);
      currentShown = Math.min(PAGE_SIZE, allFilteredItems.length);
      if (allFilteredItems.length === 0) return renderPage('empty');
      renderPage('list', allFilteredItems);
    });
  }

  function loadDetail(id) {
    renderPage('loading');
    if (!window.app || !window.app.fetchPosts) return renderPage('error', '앱을 불러올 수 없습니다.');
    window.app.fetchPosts('all', 500, 0, function(err, items) {
      if (err) return renderPage('error', err);
      var post = (items || []).find(function(p) { return p.id === id; });
      if (!post) return renderPage('notFound');
      if (window.app.incrementPostViews) window.app.incrementPostViews(id);
      renderPage('detail', post);
    });
  }

  function init() {
    var params = new URLSearchParams(location.search);
    var postId = params.get('id');
    if (postId) loadDetail(postId);
    else loadList();
  }

  document.addEventListener('click', function(e) {
    var noticeBtn = e.target && e.target.closest && e.target.closest('.notice-toggle-btn');
    if (noticeBtn) {
      e.preventDefault();
      e.stopPropagation();
      var postId = noticeBtn.getAttribute('data-post-id');
      if (!postId || !window.app || !window.app.togglePostNotice) return;
      if (!window.app.isOperator || !window.app.isOperator()) { alert('운영자만 공지 설정할 수 있어요.'); return; }
      window.app.togglePostNotice(postId, function(err) {
        if (err) { alert(err); return; }
        loadList();
      });
      return;
    }
    var postDeleteBtn = e.target && e.target.closest && e.target.closest('.post-delete-btn');
    if (postDeleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      var postId = postDeleteBtn.getAttribute('data-post-id');
      if (!postId || !window.app || !window.app.deletePost) return;
      if (!confirm('정말 삭제할까요?')) return;
      window.app.deletePost(postId, function(err) {
        if (err) { alert(err); return; }
        location.href = 'community.html';
      });
      return;
    }
    var btn = e.target && e.target.closest && e.target.closest('.comment-delete-btn');
    if (!btn) return;
    e.preventDefault();
    var postId = btn.getAttribute('data-post-id');
    var commentId = btn.getAttribute('data-comment-id');
    if (!postId || !commentId || !window.app || !window.app.deleteComment) return;
    window.app.deleteComment(postId, commentId, function() {
      window.app.getComments(postId, function(_, comments) {
        if (window.app.renderComments) window.app.renderComments('comment-list', comments, { postId: postId, canDelete: window.app.isOperator && window.app.isOperator() });
        var countEl = document.getElementById('comment-count');
        if (countEl) countEl.textContent = (comments ? comments.length : 0);
      });
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
