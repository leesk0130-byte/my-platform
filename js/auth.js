/**
 * auth.js - 전역 인증 시스템
 * - 헤더 auth 1세트만 렌더 (loggedOut: 로그인/회원가입, loggedIn: 닉네임+로그아웃)
 * - 모달: open 시 body에 inject, close 시 remove (DOM에 항상 존재 X)
 */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────
   * 1) 모달 HTML 템플릿 (열 때만 DOM에 추가)
   * ────────────────────────────────────────────────── */
  function loginModalHTML() {
    return '<div class="modal-overlay is-open" id="loginModal" role="dialog" aria-modal="true" aria-label="로그인">' +
      '<div class="modal">' +
        '<div class="modal-header"><h3>로그인</h3><button type="button" class="modal-close" data-close-modal="loginModal" aria-label="닫기">&times;</button></div>' +
        '<div class="modal-body">' +
          '<form id="loginForm" autocomplete="on">' +
            '<div class="form-group"><label for="login-email">이메일</label><input type="email" id="login-email" required autocomplete="email"></div>' +
            '<div class="form-group"><label for="login-pw">비밀번호</label><input type="password" id="login-pw" required autocomplete="current-password"></div>' +
            '<div id="login-error" class="msg-error" style="display:none;"></div>' +
            '<div id="login-success" class="msg-success" style="display:none;"></div>' +
            '<div class="modal-footer"><button type="submit" class="btn btn-primary" id="login-submit-btn">로그인</button></div>' +
          '</form>' +
          '<p class="modal-switch">아직 회원이 아니신가요? <a href="#" data-open-modal="signupModal">회원가입</a></p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function signupModalHTML() {
    return '<div class="modal-overlay is-open" id="signupModal" role="dialog" aria-modal="true" aria-label="회원가입">' +
      '<div class="modal">' +
        '<div class="modal-header"><h3>회원가입</h3><button type="button" class="modal-close" data-close-modal="signupModal" aria-label="닫기">&times;</button></div>' +
        '<div class="modal-body">' +
          '<form id="signupForm" autocomplete="on">' +
            '<div class="form-group"><label for="signup-name">이름</label><input type="text" id="signup-name" required autocomplete="name"></div>' +
            '<div class="form-group"><label for="signup-email">이메일</label><input type="email" id="signup-email" required autocomplete="email"></div>' +
            '<div class="form-group"><label for="signup-pw">비밀번호</label><input type="password" id="signup-pw" required minlength="8" autocomplete="new-password"></div>' +
            '<div class="form-group"><label for="signup-pw2">비밀번호 확인</label><input type="password" id="signup-pw2" required autocomplete="new-password"></div>' +
            '<div class="form-group form-agree"><input type="checkbox" id="signup-agree" required> <label for="signup-agree"><a href="terms.html" target="_blank" rel="noopener">이용약관</a>&#xB7;<a href="privacy.html" target="_blank" rel="noopener">개인정보처리방침</a>에 동의합니다.</label></div>' +
            '<div id="signup-error" class="msg-error" style="display:none;"></div>' +
            '<div id="signup-success" class="msg-success" style="display:none;"></div>' +
            '<div class="modal-footer"><button type="submit" class="btn btn-primary" id="signup-submit-btn">가입하기</button></div>' +
          '</form>' +
          '<p class="modal-switch">이미 회원이신가요? <a href="#" data-open-modal="loginModal">로그인</a></p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ──────────────────────────────────────────────────
   * 2) 모달 열기/닫기 (inject / remove)
   * ────────────────────────────────────────────────── */
  function removeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(function (m) { m.remove(); });
  }

  function injectModal(html) {
    removeAllModals();
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    var el = wrap.firstElementChild;
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    return el;
  }

  function openLoginModal() {
    var el = injectModal(loginModalHTML());
    var firstInput = el.querySelector('input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 80);
    bindLoginSignupForms();
  }

  function openSignupModal() {
    var el = injectModal(signupModalHTML());
    var firstInput = el.querySelector('input');
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 80);
    bindLoginSignupForms();
  }

  function closeModal(modalId) {
    var el = document.getElementById(modalId);
    if (el) el.remove();
    if (!document.querySelector('.modal-overlay')) {
      document.body.style.overflow = '';
    }
  }

  /* ──────────────────────────────────────────────────
   * 3) 헤더 auth 렌더 (단일 세트)
   * ────────────────────────────────────────────────── */
  function getAuthState() {
    if (!window.app || !window.app.isLoggedIn) return { loggedIn: false, user: null };
    return { loggedIn: !!window.app.isLoggedIn(), user: window.app.getUser ? window.app.getUser() : null };
  }

  function renderAuthActions() {
    var el = document.getElementById('auth-actions');
    if (!el) return;
    var s = getAuthState();
    if (s.loggedIn && s.user) {
      var name = (s.user.name || s.user.email || '회원') + '님';
      el.innerHTML =
        '<span class="header-user">' + name + '</span>' +
        '<button type="button" class="btn btn-outline" data-auth="logout">로그아웃</button>';
    } else {
      el.innerHTML =
        '<button type="button" class="btn btn-outline" data-auth="login">로그인</button>' +
        '<button type="button" class="btn btn-primary" data-auth="signup">회원가입</button>';
    }

    /* 드로어 auth 동기화 */
    var da = document.getElementById('drawerAuth');
    if (da) {
      if (s.loggedIn && s.user) {
        var name2 = (s.user.name || s.user.email || '회원') + '님';
        da.innerHTML =
          '<p class="drawer-auth-label">계정</p>' +
          '<span class="drawer-auth-user">' + name2 + '</span>' +
          '<button type="button" class="drawer-auth-btn" data-auth="logout">로그아웃</button>';
      } else {
        da.innerHTML =
          '<p class="drawer-auth-label">계정</p>' +
          '<button type="button" class="drawer-auth-btn" data-auth="login">로그인</button>' +
          '<button type="button" class="drawer-auth-btn drawer-auth-btn--primary" data-auth="signup">회원가입</button>';
      }
    }
  }

  /* ──────────────────────────────────────────────────
   * 4) 로그아웃
   * ────────────────────────────────────────────────── */
  function logout() {
    if (window.app && window.app.logout) window.app.logout();
    renderAuthActions();
    window.dispatchEvent(new Event('authStateChanged'));
  }

  /* ──────────────────────────────────────────────────
   * 5) 폼 바인딩 (모달 inject 후 호출)
   * ────────────────────────────────────────────────── */
  function bindLoginSignupForms() {
    if (!window.app) return;

    var loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm._authBound) {
      loginForm._authBound = true;
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var loginErr = document.getElementById('login-error');
        var loginOk  = document.getElementById('login-success');
        var loginBtn = document.getElementById('login-submit-btn');
        var email = (document.getElementById('login-email') || {}).value || '';
        var pw    = (document.getElementById('login-pw')    || {}).value || '';
        if (loginErr) { loginErr.style.display = 'none'; loginErr.textContent = ''; }
        if (loginOk)  loginOk.style.display  = 'none';
        if (!email || !pw) {
          if (loginErr) { loginErr.textContent = '이메일과 비밀번호를 입력해 주세요.'; loginErr.style.display = 'block'; }
          return;
        }
        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '로그인 중...'; }
        window.app.login(email, pw, function (err, data) {
          if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = '로그인'; }
          if (err) {
            if (loginErr) { loginErr.textContent = err; loginErr.style.display = 'block'; }
            return;
          }
          var u = (data && data.user && data.user.name) || (window.app.getUser && window.app.getUser() && window.app.getUser().name) || '';
          if (loginOk) { loginOk.textContent = (u ? u + '님, ' : '') + '로그인되었습니다.'; loginOk.style.display = 'block'; }
          setTimeout(function () {
            closeModal('loginModal');
            renderAuthActions();
            window.dispatchEvent(new Event('authStateChanged'));
          }, 1000);
        });
      });
    }

    var signupForm = document.getElementById('signupForm');
    if (signupForm && !signupForm._authBound) {
      signupForm._authBound = true;
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var suErr = document.getElementById('signup-error');
        var suOk  = document.getElementById('signup-success');
        var suBtn = document.getElementById('signup-submit-btn');
        var name  = (document.getElementById('signup-name')  || {}).value || '';
        var email = (document.getElementById('signup-email') || {}).value || '';
        var pw    = (document.getElementById('signup-pw')    || {}).value || '';
        var pw2   = (document.getElementById('signup-pw2')   || {}).value || '';
        if (suErr) suErr.style.display = 'none';
        if (suOk)  suOk.style.display  = 'none';
        if (pw !== pw2) { if (suErr) { suErr.textContent = '비밀번호가 일치하지 않아요.'; suErr.style.display = 'block'; } return; }
        if (pw.length < 8) { if (suErr) { suErr.textContent = '비밀번호는 8자 이상이에요.'; suErr.style.display = 'block'; } return; }
        if (suBtn) { suBtn.disabled = true; suBtn.textContent = '가입 중...'; }
        window.app.signup(name, email, pw, function (err) {
          if (suBtn) { suBtn.disabled = false; suBtn.textContent = '가입하기'; }
          if (err) { if (suErr) { suErr.textContent = err; suErr.style.display = 'block'; } return; }
          if (suOk) { suOk.textContent = '회원가입 완료! 로그인해 주세요.'; suOk.style.display = 'block'; }
          setTimeout(function () {
            closeModal('signupModal');
            openLoginModal();
            var ei = document.getElementById('login-email');
            if (ei) ei.value = email;
          }, 1500);
        });
      });
    }
  }

  /* ──────────────────────────────────────────────────
   * 6) 이벤트 위임 (캡처 단계 - 가장 먼저 실행)
   * ────────────────────────────────────────────────── */
  function toggleNav() {
    if (typeof window.openDrawer === 'function') {
      var btn = document.querySelector('[data-toggle-nav]');
      var expanded = btn && btn.getAttribute('aria-expanded') === 'true';
      if (expanded) window.closeDrawer(); else window.openDrawer();
      return;
    }
    var nav = document.getElementById('headerNav');
    var btn2 = document.querySelector('.nav-toggle');
    if (!nav || !btn2) return;
    var isOpen = nav.classList.toggle('is-open');
    btn2.setAttribute('aria-expanded', isOpen);
    btn2.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-auth],[data-close-modal],[data-open-modal],[data-toggle-nav]');
    if (!t) return;

    if (t.hasAttribute('data-toggle-nav')) { e.preventDefault(); e.stopPropagation(); toggleNav(); return; }

    if (t.hasAttribute('data-auth')) {
      var a = t.getAttribute('data-auth');
      e.preventDefault(); e.stopPropagation();
      if (a === 'login')  openLoginModal();
      else if (a === 'signup') openSignupModal();
      else if (a === 'logout') logout();
      return;
    }

    if (t.hasAttribute('data-close-modal')) {
      e.preventDefault(); e.stopPropagation();
      closeModal(t.getAttribute('data-close-modal'));
      return;
    }

    if (t.hasAttribute('data-open-modal')) {
      e.preventDefault(); e.stopPropagation();
      var id = t.getAttribute('data-open-modal');
      if (id === 'loginModal') openLoginModal();
      else if (id === 'signupModal') openSignupModal();
    }
  }, true);

  /* ESC 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.modal-overlay');
      if (open) closeModal(open.id);
    }
  });

  /* 오버레이 배경 클릭 닫기 */
  document.addEventListener('click', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
      closeModal(e.target.id);
    }
  });

  /* ──────────────────────────────────────────────────
   * 7) 초기화
   * ────────────────────────────────────────────────── */
  function purgeLegacyModals() {
    /* 기존에 HTML에 정적으로 남아있는 로그인/회원가입 modal-overlay만 제거 */
    ['loginModal', 'signupModal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        purgeLegacyModals();
        renderAuthActions();
      });
    } else {
      purgeLegacyModals();
      renderAuthActions();
    }

    window.addEventListener('authStateChanged', renderAuthActions);

    /* Firebase 비동기 완료 후 재렌더 (최대 9초 대기) */
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (window.app && window.app.isLoggedIn !== undefined) {
        renderAuthActions();
        clearInterval(iv);
      }
      if (tries >= 30) clearInterval(iv);
    }, 300);
  }

  /* 전역 API */
  window.authSystem = {
    renderAuthActions: renderAuthActions,
    openLoginModal: openLoginModal,
    openSignupModal: openSignupModal,
    closeModal: closeModal,
    logout: logout
  };
  window.openModal  = function (id) { if (id === 'loginModal') openLoginModal(); else if (id === 'signupModal') openSignupModal(); };
  window.closeModal = closeModal;
  window.toggleNav  = toggleNav;

  init();
})();
