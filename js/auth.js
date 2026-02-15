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
   * 초기화
   */
  function init() {
    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initModals();
        renderAuthActions();
      });
    } else {
      initModals();
      renderAuthActions();
    }

    // 인증 상태 변경 이벤트 리스너
    window.addEventListener('authStateChanged', renderAuthActions);
    
    // 주기적으로 상태 확인 (Firebase 등 비동기 인증 대응)
    var checkCount = 0;
    var checkInterval = setInterval(function() {
      checkCount++;
      if (window.app && window.app.isLoggedIn) {
        var oldState = authState;
        checkAuthState();
        if (oldState !== authState) {
          renderAuthActions();
        }
        // app이 로드되면 주기적 체크 중단
        clearInterval(checkInterval);
      }
      // 10초 후 강제 중단 (무한 루프 방지)
      if (checkCount >= 20) {
        clearInterval(checkInterval);
      }
    }, 500);
  }

  // 즉시 초기화
  init();

})();
