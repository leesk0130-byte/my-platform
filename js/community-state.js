/**
 * 커뮤니티 페이지 단일 상태 머신
 * 한 번에 하나의 상태만 렌더링
 */

(function() {
  'use strict';

  var viewState = 'loading'; // 'loading' | 'list' | 'empty' | 'detail' | 'notFound' | 'error'
  var currentData = null;
  var params = new URLSearchParams(location.search);
  var postId = params.get('id');
  var board = params.get('board') || 'all';
  
  var PAGE_SIZE = 20;
  var currentShown = 0;
  var allFilteredItems = [];
  var searchQuery = '';
  var sortBy = 'latest';
  var noticeToggleBound = false;

  /**
   * 단일 상태 렌더링
   */
  function renderPage(state, data) {
    viewState = state;
    currentData = data || null;
    
    var pageRoot = document.getElementById('page-root');
    if (!pageRoot) return;
    
    var html = '';
    
    switch(state) {
      case 'loading':
        html = renderLoading();
        break;
      case 'list':
        html = renderList(data);
        break;
      case 'empty':
        html = renderEmpty();
        break;
      case 'detail':
        html = renderDetail(data);
        break;
      case 'notFound':
        html = renderNotFound();
        break;
      case 'error':
        html = renderError(data);
        break;
    }
    
    pageRoot.innerHTML = html;
    
    // 이벤트 리스너 재등록
    attachEventListeners();
  }

  /**
   * 로딩 상태 렌더링
   */
  function renderLoading() {
    return '<div class="loading-state">' +
      '<div class="loading-spinner"></div>' +
      '<p>글 목록을 불러오는 중이에요...</p>' +
    '</div>';
  }

  /**
   * 리스트 상태 렌더링
   */
  function renderList(posts) {
    var html = '<div class="community-layout">' +
      '<div class="community-main">' +
        '<div class="card">' +
          renderTabs() +
          renderToolbar() +
          renderActions() +
          '<ul class="feed-list" id="community-list">';
    
    if (posts && posts.length > 0) {
      html += window.app.renderPosts ? renderPostsList(posts) : '';
    }
    
    html += '</ul>';
    
    if (posts && posts.length > currentShown) {
      html += '<div class="board-more-wrap">' +
        '<button type="button" class="btn btn-outline" id="posts-more-btn">더보기</button>' +
      '</div>';
    }
    
    html += '</div></div>' + renderSidebar() + '</div>';
    
    return html;
  }

  /**
   * 빈 상태 렌더링
   */
  function renderEmpty() {
    return '<div class="community-layout">' +
      '<div class="community-main">' +
        '<div class="card">' +
          renderTabs() +
          renderToolbar() +
          renderActions() +
          '<div class="empty-state">' +
            '<p class="empty-state-icon">📝</p>' +
            '<p class="empty-state-title">아직 작성된 글이 없어요!</p>' +
            '<p class="empty-state-desc">첫 글을 작성해 보세요.</p>' +
            '<a href="write.html" class="btn btn-primary">첫 글 쓰기</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      renderSidebar() +
    '</div>';
  }

  /**
   * 상세 상태 렌더링
   */
  function renderDetail(post) {
    if (!post) return renderNotFound();
    
    var html = '<div class="community-layout">' +
      '<div class="community-main">' +
        '<div class="card">' +
          '<div class="post-detail-nav">' +
            '<a href="community.html" class="btn btn-outline btn-back">← 목록으로</a>' +
          '</div>' +
          '<article class="post-detail">' +
            '<h2 class="post-detail-title">' + (post.title || '제목 없음') + '</h2>' +
            '<div class="post-detail-meta">' +
              (post.nickname || '익명') + ' · ' +
              (post.createdAt || '') + ' · ' +
              '조회 ' + (post.hits || 0) +
            '</div>' +
            '<div class="post-detail-body">' + (post.body || '') + '</div>' +
          '</article>' +
          '<section class="post-comments">' +
            '<h3 class="post-comments-title">댓글 <span id="comment-count">' + (post.commentCount || 0) + '</span></h3>' +
            '<div id="comment-list" class="comment-list"></div>' +
            '<form id="comment-form" class="comment-form">' +
              '<div class="form-group">' +
                '<input type="text" id="comment-nickname" placeholder="닉네임 (선택)" maxlength="20">' +
              '</div>' +
              '<div class="form-group">' +
                '<textarea id="comment-body" placeholder="댓글을 입력하세요" required rows="3"></textarea>' +
              '</div>' +
              '<div id="comment-error" class="msg-error" style="display:none;"></div>' +
              '<div class="form-actions">' +
                '<button type="submit" class="btn btn-primary">댓글 등록</button>' +
              '</div>' +
            '</form>' +
          '</section>' +
        '</div>' +
      '</div>' +
      renderSidebar() +
    '</div>';
    
    return html;
  }

  /**
   * NotFound 상태 렌더링
   */
  function renderNotFound() {
    return '<div class="community-layout">' +
      '<div class="community-main">' +
        '<div class="card">' +
          '<div class="empty-state">' +
            '<p class="empty-state-icon">🔍</p>' +
            '<p class="empty-state-title">글이 없거나 삭제되었습니다</p>' +
            '<p class="empty-state-desc">요청하신 글을 찾을 수 없어요.</p>' +
            '<a href="community.html" class="btn btn-primary">목록으로</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      renderSidebar() +
    '</div>';
  }

  /**
   * 에러 상태 렌더링
   */
  function renderError(message) {
    return '<div class="community-layout">' +
      '<div class="community-main">' +
        '<div class="card">' +
          '<div class="error-state">' +
            '<p class="error-state-title">글을 불러오지 못했어요</p>' +
            '<p class="error-state-desc">' + (message || '잠시 후 다시 시도해 주세요.') + '</p>' +
            '<button type="button" class="btn btn-primary" id="error-retry-btn">다시 시도</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      renderSidebar() +
    '</div>';
  }

  /**
   * 탭 렌더링
   */
  function renderTabs() {
    var boards = [
      { value: 'all', label: '전체', href: 'community.html' },
      { value: 'free', label: '자유게시판', href: 'community.html?board=free' },
      { value: 'fee', label: '수수료/정산', href: 'community.html?board=fee' },
      { value: 'qna', label: '질문답변', href: 'community.html?board=qna' },
      { value: 'info', label: '정보공유', href: 'community.html?board=info' }
    ];
    
    var html = '<div class="board-tabs">';
    boards.forEach(function(b) {
      var active = (board === b.value) ? ' class="active"' : '';
      html += '<a href="' + b.href + '"' + active + '>' + b.label + '</a>';
    });
    html += '</div>';
    
    return html;
  }

  /**
   * 툴바 렌더링
   */
  function renderToolbar() {
    return '<div class="board-toolbar">' +
      '<div class="board-search">' +
        '<input type="search" id="board-search-input" placeholder="제목 검색" value="' + searchQuery + '">' +
        '<button type="button" class="btn btn-outline btn-sm" id="board-search-btn">찾기</button>' +
      '</div>' +
      '<div class="board-sort">' +
        '<select id="board-sort-select">' +
          '<option value="latest"' + (sortBy === 'latest' ? ' selected' : '') + '>최신순</option>' +
          '<option value="hits"' + (sortBy === 'hits' ? ' selected' : '') + '>조회순</option>' +
          '<option value="comments"' + (sortBy === 'comments' ? ' selected' : '') + '>댓글순</option>' +
        '</select>' +
      '</div>' +
    '</div>';
  }

  /**
   * 액션 버튼 렌더링
   */
  function renderActions() {
    return '<div class="board-actions">' +
      '<a href="write.html" class="btn btn-primary">글쓰기</a>' +
    '</div>';
  }

  /**
   * 사이드바 렌더링
   */
  function renderSidebar() {
    return '<div class="community-sidebar">' +
      '<div class="sidebar-widget">' +
        '<h3 class="sidebar-widget-title">🔥 인기글</h3>' +
        '<ul class="sidebar-list" id="popular-posts"></ul>' +
      '</div>' +
      '<div class="sidebar-widget">' +
        '<h3 class="sidebar-widget-title">📢 공지사항</h3>' +
        '<ul class="sidebar-list">' +
          '<li class="sidebar-item"><a href="#" class="sidebar-link"><span class="sidebar-title">커뮤니티 이용규칙 안내</span></a></li>' +
        '</ul>' +
      '</div>' +
      '<div class="sidebar-widget">' +
        '<h3 class="sidebar-widget-title">✍️ 작성 가이드</h3>' +
        '<div class="sidebar-content">' +
          '<ul class="guide-list">' +
            '<li><span class="guide-text">구체적인 제목으로 작성해주세요</span></li>' +
            '<li><span class="guide-text">개인정보는 포함하지 마세요</span></li>' +
            '<li><span class="guide-text">서로 존중하는 댓글 문화</span></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="sidebar-widget">' +
        '<h3 class="sidebar-widget-title">🔐 인증 안내</h3>' +
        '<div class="sidebar-content">' +
          '<p>사업자등록증 인증 시 <strong>[인증]</strong> 배지가 표시됩니다.</p>' +
          '<a href="verify.html" class="btn btn-outline btn-sm">인증하기</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /**
   * 포스트 리스트 렌더링
   */
  function renderPostsList(posts) {
    var html = '';
    var itemsToShow = posts.slice(0, currentShown || PAGE_SIZE);
    
    var isOp = window.app && window.app.isOperator && window.app.isOperator();
    itemsToShow.forEach(function(post) {
      var categoryLabel = post.board === 'free' ? '자유' :
                          post.board === 'fee' ? '수수료' :
                          post.board === 'qna' ? '질문' :
                          post.board === 'info' ? '정보' : '';
      var noticeBadge = post.notice ? '<span class="notice-badge">공지</span>' : '';
      var noticeBtn = isOp ? '<button type="button" class="notice-toggle-btn btn btn-outline btn-sm" data-post-id="' + (post.id || '').replace(/"/g, '&quot;') + '">' + (post.notice ? '공지 해제' : '공지') + '</button>' : '';
      var commentBadge = (post.commentCount && post.commentCount > 0) ?
        '<span class="comment-count-badge">' + post.commentCount + '</span>' : '';
      
      html += '<li class="feed-item feed-item-row">' +
        '<a href="community.html?id=' + post.id + '" class="feed-title-wrapper">' +
          '<span class="feed-title-content feed-title-row">' +
            noticeBadge +
            (categoryLabel ? '<span class="category-badge">' + categoryLabel + '</span>' : '') +
            '<span class="feed-title-text">' + (post.title || '제목 없음') + '</span>' +
          '</span>' +
          commentBadge +
        '</a>' +
        '<span class="feed-meta">' + (post.author || post.nickname || '익명') + ' · ' + (post.date || post.createdAt || '') + ' · 조회 ' + (post.hits || 0) + '</span>' +
        (noticeBtn ? '<span class="feed-operator-actions">' + noticeBtn + '</span>' : '') +
      '</li>';
    });
    
    return html;
  }

  /**
   * 이벤트 리스너 등록
   */
  function attachEventListeners() {
    // 검색 버튼
    var searchBtn = document.getElementById('board-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', handleSearch);
    }
    
    // 정렬 변경
    var sortSelect = document.getElementById('board-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', handleSortChange);
    }
    
    // 더보기 버튼
    var moreBtn = document.getElementById('posts-more-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', handleLoadMore);
    }
    
    // 공지 토글 (운영자만, 위임, 한 번만 등록)
    if (!noticeToggleBound) {
      noticeToggleBound = true;
      document.body.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest && e.target.closest('.notice-toggle-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute('data-post-id');
        if (!id || !window.app || !window.app.togglePostNotice) return;
        if (!window.app.isOperator || !window.app.isOperator()) { alert('운영자만 공지 설정할 수 있어요.'); return; }
        window.app.togglePostNotice(id, function(err) {
          if (err) { alert(err); return; }
          loadList();
        });
      });
    }
    
    // 에러 재시도
    var retryBtn = document.getElementById('error-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        if (postId) {
          loadDetail(postId);
        } else {
          loadList();
        }
      });
    }
    
    // 댓글 폼
    var commentForm = document.getElementById('comment-form');
    if (commentForm && postId) {
      commentForm.addEventListener('submit', handleCommentSubmit);
      loadComments(postId);
    }
    
    // 인기글 로드
    loadPopularPosts();
  }

  /**
   * 검색 핸들러
   */
  function handleSearch() {
    var input = document.getElementById('board-search-input');
    if (input) {
      searchQuery = input.value.trim();
      currentShown = 0;
      loadList();
    }
  }

  /**
   * 정렬 변경 핸들러
   */
  function handleSortChange(e) {
    sortBy = e.target.value;
    currentShown = 0;
    loadList();
  }

  /**
   * 더보기 핸들러
   */
  function handleLoadMore() {
    currentShown += PAGE_SIZE;
    renderPage('list', allFilteredItems);
  }

  /**
   * 댓글 제출 핸들러
   */
  function handleCommentSubmit(e) {
    e.preventDefault();
    
    var nickname = document.getElementById('comment-nickname').value.trim();
    var body = document.getElementById('comment-body').value.trim();
    var errorEl = document.getElementById('comment-error');
    
    if (!body) {
      if (errorEl) {
        errorEl.textContent = '댓글 내용을 입력해 주세요.';
        errorEl.style.display = 'block';
      }
      return;
    }
    
    if (!window.app || !window.app.addComment) return;
    
    window.app.addComment(postId, nickname || '익명', body, false, function(err) {
      if (err) {
        if (errorEl) {
          errorEl.textContent = err;
          errorEl.style.display = 'block';
        }
        return;
      }
      
      document.getElementById('comment-body').value = '';
      loadComments(postId);
    });
  }

  /**
   * 글 목록 로드
   */
  function loadList() {
    renderPage('loading');
    
    if (!window.app || !window.app.fetchPosts) return;
    
    window.app.fetchPosts(board, 500, 0, function(err, items) {
      if (err) {
        console.error('[community-state] fetchPosts 오류', err);
        renderPage('error', err);
        return;
      }
      
      allFilteredItems = filterAndSortPosts(items || []);
      currentShown = Math.min(PAGE_SIZE, allFilteredItems.length);
      
      if (allFilteredItems.length === 0) {
        renderPage('empty');
      } else {
        renderPage('list', allFilteredItems);
      }
    });
  }

  /**
   * 글 상세 로드
   */
  function loadDetail(id) {
    renderPage('loading');
    
    if (!window.app || !window.app.fetchPosts) return;
    
    window.app.fetchPosts('all', 500, 0, function(err, items) {
      if (err) {
        console.error('[community-state] fetchPosts(상세) 오류', err);
        renderPage('error', err);
        return;
      }

      var post = (items || []).find(function(p) { return p.id === id; });
      
      if (post) {
        // 조회수 증가
        if (window.app.incrementPostViews) {
          window.app.incrementPostViews(id);
        }
        renderPage('detail', post);
      } else {
        renderPage('notFound');
      }
    });
  }

  /**
   * 댓글 로드
   */
  function loadComments(id) {
    if (!window.app || !window.app.getComments || !window.app.renderComments) return;
    
    window.app.getComments(id, function(err, comments) {
      if (err) return;
      
      var listEl = document.getElementById('comment-list');
      var countEl = document.getElementById('comment-count');
      
      if (listEl) {
        window.app.renderComments('comment-list', comments, {
          postId: id,
          canDelete: window.app.isOperator && window.app.isOperator()
        });
      }
      
      if (countEl) {
        countEl.textContent = comments ? comments.length : 0;
      }
    });
  }

  /**
   * 인기글 로드
   */
  function loadPopularPosts() {
    if (!window.app || !window.app.fetchPosts) return;
    
    window.app.fetchPosts('all', 100, 0, function(err, items) {
      if (err || !items || !items.length) return;
      
      var popular = items.sort(function(a, b) {
        var scoreA = (a.hits || 0) + (a.commentCount || 0) * 3;
        var scoreB = (b.hits || 0) + (b.commentCount || 0) * 3;
        return scoreB - scoreA;
      }).slice(0, 5);
      
      var popularEl = document.getElementById('popular-posts');
      if (!popularEl) return;
      
      var html = popular.map(function(post) {
        var title = post.title || '제목 없음';
        if (title.length > 30) title = title.substring(0, 30) + '...';
        
        var hits = post.hits || 0;
        var comments = post.commentCount || 0;
        var meta = '조회 ' + hits;
        if (comments > 0) meta += ' · 댓글 ' + comments;
        
        return '<li class="sidebar-item">' +
          '<a href="community.html?id=' + post.id + '" class="sidebar-link">' +
            '<span class="sidebar-title">' + title + '</span>' +
            '<span class="sidebar-meta">' + meta + '</span>' +
          '</a>' +
        '</li>';
      }).join('');
      
      popularEl.innerHTML = html;
    });
  }

  /**
   * 포스트 필터링 및 정렬
   */
  function filterAndSortPosts(posts) {
    var filtered = posts;
    
    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(function(p) {
        return (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    // 정렬
    filtered.sort(function(a, b) {
      if (sortBy === 'hits') {
        return (b.hits || 0) - (a.hits || 0);
      } else if (sortBy === 'comments') {
        return (b.commentCount || 0) - (a.commentCount || 0);
      } else {
        // 최신순 (기본)
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
    
    return filtered;
  }

  /**
   * 초기화
   */
  function init() {
    if (postId) {
      loadDetail(postId);
    } else {
      loadList();
    }
  }

  // DOM 로드 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
