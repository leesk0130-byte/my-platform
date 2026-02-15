# 홈 모달 본문 제거 · inject/remove · 푸터 축약

## 수정한 파일 목록

| 파일 | 변경 내용 |
|------|------------|
| **index.html** | 1) 본문에서 로그인/회원가입 모달 마크업 전부 제거 (### 로그인, ### 회원가입, 폼/input/약관 체크 등). 2) openModal/closeModal 및 #loginModal·#signupModal 폼 핸들러 인라인 스크립트 제거(모달은 auth.js에서 열 때만 inject). 3) 푸터 연락처: 휴대폰·실주소 제거, 문의 이메일만 노출. |
| **js/auth.js** (기존 유지) | 모달: open 시 body에 DOM 생성·append, close 시 remove. ESC·오버레이 클릭 닫기. aria-modal, role="dialog", 포커스 이동. |

## 홈에서 모달이 기본 상태에 절대 보이지 않는지 체크리스트

- [x] index.html 본문에 "### 로그인", "### 회원가입" 섹션 없음
- [x] index.html 본문에 로그인/회원가입 폼, 이메일·비밀번호 input, 약관 체크 마크업 없음
- [x] 기본 상태에서 모달 DOM이 페이지에 없음(열 때만 auth.js가 body에 inject, 닫을 때 remove)
- [x] 레이아웃/스크롤에 영향 0(닫혀 있으면 DOM에 없음)
- [x] ESC로 모달 닫기
- [x] 오버레이 클릭으로 모달 닫기
- [x] 모달에 aria-modal, role="dialog" 등 접근성 속성 사용(auth.js 주입 마크업에 포함)
- [x] 푸터: 휴대폰·실주소 전면 노출 제거, 문의 이메일만 표기
