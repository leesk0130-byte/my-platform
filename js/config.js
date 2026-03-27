/**
 * API 베이스 URL (서버 배포 시 여기만 바꾸면 됨)
 */
window.API_BASE_URL = window.API_BASE_URL || '';

/**
 * Firebase 설정 (회원가입/로그인용) — 이미 적용됨
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDt7urkVnu83t7vqRtxL1MjaRKf3oSTK8Q",
  authDomain: "my-platform-9ffa3.firebaseapp.com",
  projectId: "my-platform-9ffa3",
  storageBucket: "my-platform-9ffa3.firebasestorage.app",
  messagingSenderId: "756858954176",
  appId: "1:756858954176:web:8cecdbdde15888888002825",
  measurementId: "G-ZZ3EQ1Z6G5"
};

function apiUrl(path) {
  var base = (window.API_BASE_URL || '').replace(/\/$/, '');
  var p = (path || '').replace(/^\//, '');
  return base ? base + '/' + p : '/' + p;
}
