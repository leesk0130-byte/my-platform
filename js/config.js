/**
 * API 베이스 URL (서버 배포 시 여기만 바꾸면 됨)
 * - 같은 도메인: '' 또는 '/'
 * - 다른 서버: 'https://your-api.com'
 *
 * 회원가입/로그인 연동: Cloudflare + Firebase 조합 가능
 * - Firebase Authentication: 이메일·비밀번호 가입/로그인, 토큰 발급 (이 화면의 로그인·회원가입 폼과 연동 가능)
 * - Cloudflare: 사이트 앞단에 두어 DDoS 방어, 캐시, SSL 등 적용 후 Firebase/백엔드로 전달
 * - 연동 시 API_BASE_URL을 Firebase Functions URL 또는 자체 백엔드로 설정하거나, Firebase SDK로 직접 로그인/회원가입 처리 후 토큰만 저장
 *
 * 서버 연동 시 제공하면 되는 API:
 * - GET  /api/news?limit=&offset=  → { items: [], total? }
 * - GET  /api/community/posts?board=&limit=&offset=  → { items: [], total? }
 * - POST /api/community/posts  → Body: { title, body, author?, board? }  → { id, title, ... }
 * - GET  /api/community/posts/:id/comments  → { items: [] }
 * - POST /api/community/posts/:id/comments  → Body: { author?, body }  → { id, ... }
 * - POST /api/auth/login   → Body: { email, password }  → { token, user? }
 * - POST /api/auth/signup  → Body: { name, email, password }  → { token, user? }
 */
window.API_BASE_URL = window.API_BASE_URL || '';

function apiUrl(path) {
  var base = (window.API_BASE_URL || '').replace(/\/$/, '');
  var p = (path || '').replace(/^\//, '');
  return base ? base + '/' + p : '/' + p;
}
