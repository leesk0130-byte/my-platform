# 수정 요약 (현상 재현 → 원인 → 수정 → 재발 방지)

## 변경 파일 목록

- **community.html** — 상태 머신, 검색 텍스트, 네비 auth, 모달 a11y, 보드 액션 정리
- **news.html** — 뉴스 뷰 상태(loading/list/empty/error), 본문 ## 제거, 에러/재시도 UI
- **index.html, pg.html, must-know.html, calculator.html, about.html, verify.html** — 헤더 auth 한 세트만 노출
- **css/common.css** — 모달 aria, 컨테이너 1040px, 섹션 간격 변수

---

## 1. 전역 네비: 로그인/회원가입/로그아웃 동시 노출 → 한 세트만 노출

**원인**  
로그인/회원가입/로그아웃을 각각 display로만 제어해서, 타이밍에 따라 둘 다 보이거나 둘 다 안 보일 수 있었음.

**수정**  
- 헤더에 `headerAuthGuest`(로그인+회원가입), `headerAuthUser`(이름+로그아웃) 두 블록으로 나눔.
- `updateHeaderAuth()`에서:
  - 로그인 시: `headerAuthGuest` 숨김, `headerAuthUser` 표시.
  - 비로그인 시: `headerAuthGuest` 표시, `headerAuthUser` 숨김.

**재발 방지**  
모든 페이지에서 동일한 헤더 마크업과 같은 `updateHeaderAuth()` 로직 사용.

---

## 2. 커뮤니티: 로딩/빈목록/notFound/글상세가 동시에 보임 → 단일 상태만 렌더

**원인**  
여러 영역(posts-loading, posts-empty, post-not-found, post-detail)을 각각 display만 바꿔서, 상태가 섞여서 보이는 설계 결함.

**수정**  
- **상태 머신**: `viewState = 'loading' | 'list' | 'empty' | 'detail' | 'notFound' | 'error'`
- **setViewState(state)**  
  - `[data-view]`인 요소만 하나 골라서 표시하고, 나머지는 전부 숨김.  
  - 목록용 UI(탭/툴바/글쓰기)는 `loading/list/empty/error`일 때만 표시, `detail/notFound`일 때는 숨김.
- **마크업**  
  - `view-loading`, `view-list`(목록+더보기), `view-empty`, `view-not-found`, `view-error`, `view-detail` 로 나누고 각각 `data-view="loading"` 등 부여.
- **플로우**  
  - URL에 `?id=` 있으면: 글 있으면 `setViewState('detail')`, 없으면 `setViewState('notFound')`.  
  - `?id=` 없으면: `setViewState('loading')` 후 `loadList(false)` → 결과에 따라 `setViewState('list')` 또는 `setViewState('empty')`.

**재발 방지**  
커뮤니티 화면은 항상 `setViewState()` 한 번으로 한 상태만 보이게 하고, 새 UI 추가 시에도 `[data-view]` + setViewState 규칙 유지.

---

## 3. 뉴스: 로딩 문구 계속 보임, ## 깨진 텍스트 → 상태 분리 + 본문 정리

**원인**  
- 로딩/리스트/상세를 동시에 두고 display만 바꿔서, 로딩이 안 없어지거나 리스트와 겹쳐 보일 수 있음.  
- 본문에 마크다운 `##`가 그대로 출력됨.

**수정**  
- **뉴스 뷰 상태**: `data-news-view="loading" | "list" | "empty" | "detail" | "error"`  
  - **setNewsView(state)** 로 위와 같이 한 번에 하나만 표시.
- **본문**  
  - 상세 본문 출력 전에 `body.replace(/^#+\s*/gm, '')` 로 `##` 등 제거.  
  - HTML 이스케이프 후 `<p>` 로 줄바꿈만 `<br>` 처리.
- **에러 UI**  
  - `news-error` 블록 추가, 재시도 버튼으로 `setNewsView('loading')` 후 fetch 재호출.

**재발 방지**  
뉴스도 “한 화면에 하나의 상태만” 규칙으로 두고, 본문은 항상 마크다운 제거 + 이스케이프 후 출력.

---

## 4. 검색 영역 "검색 검색" 중복 → 라벨/버튼 정리

**원인**  
라벨(또는 placeholder)과 버튼 문구가 둘 다 "검색"이라 겹쳐 보임.

**수정**  
- 라벨: `sr-only`로 "제목으로 검색", placeholder: "제목 검색".  
- 버튼: 문구 "찾기", `aria-label="검색 실행"`.

**재발 방지**  
라벨/placeholder/버튼 텍스트를 역할별로 나누고, 시각적으로 같은 문구 반복 지양.

---

## 5. 로그인/회원가입 모달 상시 노출·DOM 지저분 → 기본 숨김 + 접근성

**원인**  
모달이 display:none이지만 접근성 속성과 ESC 동작이 없었음.

**수정**  
- 모달은 기존처럼 기본 `display: none`, 열릴 때만 `is-open`으로 표시.  
- **접근성**  
  - `.modal-overlay`에 `aria-hidden="true"`(기본), `aria-modal="true"`, `role="dialog"`.  
  - `openModal(id)`: 해당 오버레이에 `aria-hidden="false"`.  
  - `closeModal(id)`: `aria-hidden="true"`.  
- **ESC**  
  - `document` keydown에서 `Escape` 시 `.modal-overlay.is-open` 찾아서 `closeModal(id)` 호출.  
- 배경 클릭으로 닫기는 기존 유지.

**재발 방지**  
새 모달 추가 시 동일하게 `aria-hidden`/`aria-modal`/`role` 설정하고, open/close 시 ESC·포커스 정리.

---

## 6. UI 시스템: 컨테이너·간격 통일

**수정**  
- **공통 컨테이너**  
  - `--container-max: 1040px`, `--section-gap: 32px`  
  - `.container`: `max-width: var(--container-max)`, 좌우 padding 24px(768px 이하 16px).  
- **섹션**  
  - `.section { margin-bottom: var(--section-gap); }`

**재발 방지**  
새 레이아웃은 `--container-max`, `--section-gap`, `--space-*` 만 사용해 간격 통일.

---

## 7. 라우팅·자산 경로 (Cloudflare Pages)

- **URL**  
  - 링크는 모두 `.html` 기준 유지 (`community.html`, `news.html` 등).  
  - 정적 배포이므로 `/community` 없이 `community.html`만 사용해 404 없음.  
- **자산**  
  - CSS/JS는 상대경로(`css/common.css`, `js/app.js`)라 페이지 경로와 무관하게 동일하게 로드됨.

---

## 상태 머신 구조 (커뮤니티)

```text
viewState = 'loading' | 'list' | 'empty' | 'detail' | 'notFound' | 'error'

setViewState(state):
  1. [data-view] 전부 숨김
  2. data-view === state 인 요소만 표시
  3. state가 detail/notFound 이면 탭·툴바·글쓰기 숨김, 그 외면 표시

URL ?id= 있음 → 글 있으면 detail, 없으면 notFound
URL ?id= 없음 → loading → fetch → list 또는 empty
```

---

## 수정 전/후 요약

| 항목 | 수정 전 | 수정 후 |
|------|--------|--------|
| 네비 로그인/로그아웃 | 동시 노출 가능 | 로그인 시 (이름+로그아웃), 비로그인 시 (로그인+회원가입)만 표시 |
| 커뮤니티 화면 | 로딩/빈목록/notFound/상세 동시 존재 | 한 번에 하나의 상태만 표시 (setViewState) |
| 뉴스 | 로딩 유지·## 노출 | loading→list/empty/detail 분리, ## 제거, 에러+재시도 |
| 검색 | "검색 검색" | placeholder "제목 검색", 버튼 "찾기" |
| 모달 | a11y·ESC 없음 | aria-hidden, role, ESC 닫기 |
| 레이아웃 | 컨테이너 1200px 등 | 1040px, 섹션 32px 간격 변수 |
