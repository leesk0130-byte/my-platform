/**
 * 전역 인증 상태 관리 시스템
 * 모든 페이지에서 공통으로 사용
 */

(function() {
  'use strict';

  // 인증 상태 타입
  var AUTH_STATES = {
    UNKNOWN: 'unknown',
    LOGGED_OUT: 'loggedOut', 
    LOGGED_IN: 'loggedIn'
  };

  var currentAuthState = AUTH_STATES.UNKNOWN;

  /**
   * 현재 인증 상태 확인
   */
  function getAuthState() {
    if (!window.app) return AUTH_STATES.UNKNOWN;
    
    var isLoggedIn = window.app.isLoggedIn && window.app.isLoggedIn();
    var user = window.app.getUser && window.app.getUser();
    
    if (isLoggedIn && user) {
      return AUTH_STATES.LOGGED_IN;
    } else {
      return AUTH_STATES.LOGGED_OUT;
    }
  }

  /**
   * 헤더 인증 UI 업데이트
   */
  function updateHeaderAuth() {
    var guestEl = document.getElementById('headerAuthGuest');
    var userEl = document.getElementById('headerAuthUser');
    var nameEl = document.getElementById('headerUser');
    
    if (!guestEl || !userEl) return;
    
    var authState = getAuthState();
    currentAuthState = authState;
    
    switch (authState) {
      case AUTH_STATES.LOGGED_IN:
        var user = window.app.getUser();
        guestEl.style.display = 'none';
        userEl.style.display = 'flex';
        if (nameEl && user) {
          nameEl.textContent = (user.name || user.email || '회원') + '님';
        }
        break;
        
      case AUTH_STATES.LOGGED_OUT:
        guestEl.style.display = 'flex';
        userEl.style.display = 'none';
        break;
        
      case AUTH_STATES.UNKNOWN:
      default:
        // 로딩 중이거나 불명확한 상태 - 게스트 UI 표시
        guestEl.style.display = 'flex';
        userEl.style.display = 'none';
        break;
    }
  }

  /**
   * 모달 관리
   */
  function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // 포커스 트랩
    var focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
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
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.toggleNav = toggleNav;
  window.updateHeaderAuth = updateHeaderAuth;

  /**
   * 초기화
   */
  function init() {
    // DOM 로드 완료 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        initModals();
        updateHeaderAuth();
      });
    } else {
      initModals();
      updateHeaderAuth();
    }

    // 인증 상태 변경 이벤트 리스너
    window.addEventListener('authStateChanged', updateHeaderAuth);
    
    // 주기적으로 상태 확인 (Firebase 등 비동기 인증 대응)
    var checkInterval = setInterval(function() {
      if (window.app && window.app.isLoggedIn) {
        var newState = getAuthState();
        if (newState !== currentAuthState) {
          updateHeaderAuth();
        }
        // app이 로드되면 주기적 체크 중단
        if (newState !== AUTH_STATES.UNKNOWN) {
          clearInterval(checkInterval);
        }
      }
    }, 500);
    
    // 5초 후 강제 중단 (무한 루프 방지)
    setTimeout(function() {
      clearInterval(checkInterval);
    }, 5000);
  }

  // 즉시 초기화
  init();

})();