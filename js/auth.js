/**
 * 전역 인증 상태 관리 시스템 (단일 소스 오브 트루스)
 * 헤더 Auth 영역을 상태에 따라 1세트만 렌더링
 */

(function() {
  'use strict';

  var authState = 'loggedOut'; // 'loggedOut' | 'loggedIn'
  var currentUser = null;

  /**
   * 인증 상태 확인 및 업데이트
   */
  function checkAuthState() {
    if (!window.app) {
      authState = 'loggedOut';
      currentUser = null;
      return;
    }
    
    var isLoggedIn = window.app.isLoggedIn && window.app.isLoggedIn();
    var user = window.app.getUser && window.app.getUser();
    
    if (isLoggedIn && user) {
      authState = 'loggedIn';
      currentUser = user;
    } else {
      authState = 'loggedOut';
      currentUser = null;
    }
  }

  /**
   * 헤더 Auth Actions 렌더링 (상태에 따라 1세트만)
   */
  function renderAuthActions() {
    var authContainer = document.getElementById('auth-actions');
    if (!authContainer) return;
    
    checkAuthState();
    
    var html = '';
    
    if (authState === 'loggedIn') {
      // 로그인 상태: [닉네임] [로그아웃]
      var displayName = (currentUser.name || currentUser.email || '회원') + '님';
      html = '<span class="header-user">' + displayName + '</span>' +
             '<button type="button" class="btn btn-outline" onclick="window.authSystem.logout()">로그아웃</button>';
    } else {
      // 비로그인 상태: [로그인] [회원가입]
      html = '<button type="button" class="btn btn-outline" onclick="window.authSystem.openLoginModal()">로그인</button>' +
             '<button type="button" class="btn btn-primary" onclick="window.authSystem.openSignupModal()">회원가입</button>';
    }
    
    authContainer.innerHTML = html;
  }

  /**
   * 로그인 모달 열기
   */
  function openLoginModal() {
    var modal = document.getElementById('loginModal');
    if (!modal) {
      console.error('Login modal not found');
      return;
    }
    
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // 포커스 트랩
    var focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      setTimeout(function() {
        focusableElements[0].focus();
      }, 100);
    }
  }

  /**
   * 회원가입 모달 열기
   */
  function openSignupModal() {
    var modal = document.getElementById('signupModal');
    if (!modal) {
      console.error('Signup modal not found');
      return;
    }
    
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // 포커스 트랩
    var focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      setTimeout(function() {
        focusableElements[0].focus();
      }, 100);
    }
  }

  /**
   * 모달 닫기
   */
  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * 로그아웃
   */
  function logout() {
    if (window.app && window.app.logout) {
      window.app.logout();
    }
    authState = 'loggedOut';
    currentUser = null;
    renderAuthActions();
    
    // authStateChanged 이벤트 발생
    window.dispatchEvent(new Event('authStateChanged'));
  }

  /**
   * 로그인 성공 처리
   */
  function onLoginSuccess() {
    checkAuthState();
    renderAuthActions();
    
    // authStateChanged 이벤트 발생
    window.dispatchEvent(new Event('authStateChanged'));
  }

  /**
   * 모달 초기화 (ESC 키, 오버레이 클릭)
   */
  function initModals() {
    // 모든 모달에 기본 속성 설정
    document.querySelectorAll('.modal-overlay').forEach(function(modal) {
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', 'dialog');
      
      // 오버레이 클릭으로 닫기
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var openModal = document.querySelector('.modal-overlay.is-open');
        if (openModal) {
          closeModal(openModal.id);
        }
      }
    });
  }

  /**
   * 네비게이션 토글 (모바일)
   */
  function toggleNav() {
    var nav = document.getElementById('headerNav');
    var btn = document.querySelector('.nav-toggle');
    if (!nav || !btn) return;
    
    var isOpen = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen);
    btn.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  }

  /**
   * 전역 함수 등록
   */
  window.authSystem = {
    renderAuthActions: renderAuthActions,
    openLoginModal: openLoginModal,
    openSignupModal: openSignupModal,
    closeModal: closeModal,
    logout: logout,
    onLoginSuccess: onLoginSuccess,
    checkAuthState: checkAuthState
  };
  
  // 하위 호환성을 위한 전역 함수
  window.openModal = function(modalId) {
    if (modalId === 'loginModal') {
      openLoginModal();
    } else if (modalId === 'signupModal') {
      openSignupModal();
    }
  };
  window.closeModal = closeModal;
  window.toggleNav = toggleNav;

  /**
   * 로그인/회원가입 폼 바인딩 (모든 페이지에서 #loginForm, #signupForm 있으면 동작)
   */
  function bindLoginSignupForms() {
    if (!window.app || !window.app.login || !window.app.signup) return;

    var loginForm = document.getElementById('loginForm');
    var loginErrorEl = document.getElementById('login-error');
    var loginSuccessEl = document.getElementById('login-success');
    var loginBtn = document.getElementById('login-submit-btn');
    if (loginForm && !loginForm._authBound) {
      loginForm._authBound = true;
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('login-email');
        var pwEl = document.getElementById('login-pw');
        var emailVal = email ? email.value.trim() : '';
        var pw = pwEl ? pwEl.value : '';
        if (loginErrorEl) { loginErrorEl.style.display = 'none'; loginErrorEl.textContent = ''; }
        if (loginSuccessEl) loginSuccessEl.style.display = 'none';
        if (!emailVal || !pw) {
          if (loginErrorEl) { loginErrorEl.textContent = '이메일과 비밀번호를 입력해 주세요.'; loginErrorEl.style.display = 'block'; }
          return;
        }
        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '로그인 중...'; }
        window.app.login(emailVal, pw, function(err, data) {
          if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = '로그인'; }
          if (err) {
            if (loginErrorEl) { loginErrorEl.textContent = err; loginErrorEl.style.display = 'block'; }
            return;
          }
          if (loginErrorEl) loginErrorEl.style.display = 'none';
          if (loginSuccessEl) {
            var userName = (data && data.user && data.user.name) ? data.user.name : (window.app.getUser && window.app.getUser() && window.app.getUser().name) ? window.app.getUser().name : '';
            loginSuccessEl.textContent = userName ? userName + '님, 로그인되었습니다.' : '로그인되었습니다.';
            loginSuccessEl.style.display = 'block';
          }
          setTimeout(function() {
            closeModal('loginModal');
            if (loginSuccessEl) loginSuccessEl.style.display = 'none';
            renderAuthActions();
          }, 1200);
        });
      });
    }

    var signupForm = document.getElementById('signupForm');
    var signupErrorEl = document.getElementById('signup-error');
    var signupSuccessEl = document.getElementById('signup-success');
    var signupBtn = document.getElementById('signup-submit-btn');
    if (signupForm && !signupForm._authBound) {
      signupForm._authBound = true;
      signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var nameEl = document.getElementById('signup-name');
        var emailEl = document.getElementById('signup-email');
        var pwEl = document.getElementById('signup-pw');
        var pw2El = document.getElementById('signup-pw2');
        var name = nameEl ? nameEl.value.trim() : '';
        var emailVal = emailEl ? emailEl.value.trim() : '';
        var pw = pwEl ? pwEl.value : '';
        var pw2 = pw2El ? pw2El.value : '';
        if (signupErrorEl) signupErrorEl.style.display = 'none';
        if (signupSuccessEl) signupSuccessEl.style.display = 'none';
        if (pw !== pw2) { if (signupErrorEl) { signupErrorEl.textContent = '비밀번호가 일치하지 않아요.'; signupErrorEl.style.display = 'block'; } return; }
        if (pw.length < 8) { if (signupErrorEl) { signupErrorEl.textContent = '비밀번호는 8자 이상이에요.'; signupErrorEl.style.display = 'block'; } return; }
        if (signupBtn) { signupBtn.disabled = true; signupBtn.textContent = '가입 중...'; }
        window.app.signup(name, emailVal, pw, function(err) {
          if (signupBtn) { signupBtn.disabled = false; signupBtn.textContent = '가입하기'; }
          if (err) { if (signupErrorEl) { signupErrorEl.textContent = err; signupErrorEl.style.display = 'block'; } return; }
          if (signupSuccessEl) { signupSuccessEl.textContent = '회원가입이 완료되었어요. 로그인해 주세요.'; signupSuccessEl.style.display = 'block'; }
          setTimeout(function() {
            closeModal('signupModal');
            if (signupErrorEl) signupErrorEl.style.display = 'none';
            if (signupSuccessEl) signupSuccessEl.style.display = 'none';
            openLoginModal();
            if (document.getElementById('login-email')) document.getElementById('login-email').value = emailVal;
          }, 1800);
        });
      });
    }
  }

  /**
   * 초기화
   */
  function init() {
    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initModals();
        renderAuthActions();
        bindLoginSignupForms();
      });
    } else {
      initModals();
      renderAuthActions();
      bindLoginSignupForms();
    }

    // 인증 상태 변경 이벤트 리스너
    window.addEventListener('authStateChanged', renderAuthActions);
    
    // 주기적으로 상태 확인 (Firebase 등 비동기 인증 대응) + 폼 바인딩 재시도 (app 지연 로드 대비)
    var checkCount = 0;
    var checkInterval = setInterval(function() {
      checkCount++;
      if (window.app && window.app.isLoggedIn) {
        var oldState = authState;
        checkAuthState();
        if (oldState !== authState) {
          renderAuthActions();
        }
      }
      bindLoginSignupForms();
      if (window.app && window.app.isLoggedIn !== undefined) clearInterval(checkInterval);
      if (checkCount >= 20) clearInterval(checkInterval);
    }, 500);
  }

  // 즉시 초기화
  init();

})();
