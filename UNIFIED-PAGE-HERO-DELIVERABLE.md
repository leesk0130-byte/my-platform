# 통일 작업 산출물: 페이지 상단·히어로·여백·검색

## 1. 공통 CSS (토큰/컴포넌트) 변경 내용

### styles/tokens.css
- `--px-m`: 16px, `--px-d`: 20px (컨테이너 좌우 패딩)
- `--hero-pad-m`: 16px, `--hero-pad-d`: 24px (초록 히어로 박스 패딩)
- `--fs-h1`: 28px, `--fs-h2`: 22px, `--fs-body`: 16px (페이지 헤더·히어로 타이포)
- `--lh-title`: 1.3 (제목 줄간격)
- 기존 `--gap-1`~`--gap-6`, `--radius`, `--container-max` 유지

### styles/components.css
- **.container**: `padding: 0 var(--px-d)`, `@media (max-width:768px)` → `padding: 0 var(--px-m)`
- **.page**: `padding: var(--gap-4) 0 var(--gap-6)`
- **.page-head**: `margin: var(--gap-3) 0 var(--gap-3)`
- **.page-head .breadcrumb**: `font-size: 13px`, `opacity: .75`, `margin-bottom: var(--gap-2)`
- **.page-title**: `font-size: var(--fs-h2)`, `line-height: var(--lh-title)`, `margin: 0 0 var(--gap-2)`
- **.page-lead**: `font-size: var(--fs-body)`, `line-height: var(--lh-body)`, `max-width: 72ch`, `opacity: .9`
- **.hero-green**: 초록 히어로 박스 공통
  - `margin-top: var(--gap-3)`, `margin-bottom: var(--gap-5)`
  - `border-radius: var(--radius)`, `padding: var(--hero-pad-d)` / 모바일 `var(--hero-pad-m)`
  - 배경 그라데이션, 그림자, `.hero-green h1/h2`, `.hero-green p` 타이포 통일

### css/common.css
- `.hero.hero-banner` 및 `.page-calculator`/`.page-news` 전용 여백·배너 블록 제거 (통일은 `.hero-green`으로 이관)
- `.board-search`: `gap: var(--space-3)`, input `min-width: 8rem`, `.btn` `flex-shrink: 0`, `white-space: nowrap` (커뮤니티 검색 뭉개짐 방지)

---

## 2. 각 페이지 상단 구조 통일 (파일별 요약)

### calculator.html
- `main.page` > `div.container` > `div.page-head`(breadcrumb) > `section.hero-green`(h2 + p 2개) > `section.section`(계산 폼·결과·관련 링크)

### news.html
- `main.page` > `div.container` > `div.page-head`(breadcrumb) > `section.hero-green`(h2 + p) > `section.section`(최신 뉴스 카드, `#page-root`)

### pg.html
- `main.page` > `div.container` > `div.page-head`(breadcrumb) > `section.hero-green`(h2 + p) > `div.pg-disclaimer` > 기존 섹션들

### community.html
- `main.page` > `div.container` > `div.page-head`(breadcrumb) > `section.hero-green`(h2 + p) > `p.community-rules-notice` > `section.section.community-section`(보드 탭·검색·리스트)

### index.html (홈)
- 변경 없음. 기존 `main.container` + `.hero`(검색·CTA) 유지. 초록 박스 없음.

---

## 3. 검색 UI 수정

- **헤더 검색**: 모든 페이지에서 placeholder를 `"뉴스·가이드·커뮤니티 검색"`으로 통일. 버튼은 `"검색"` 유지. (`검색 검색` 중복 제거)
- **커뮤니티 검색**: input `placeholder="제목으로 검색"`, 버튼 `"찾기"`. `.board-search`에 gap·min-width·flex-shrink 적용으로 `제목으로 검색 찾기` 뭉개짐 방지.

---

## 4. 뉴스 빈 상태

- `js/news-render.js`의 `showEmpty()` 유지: 리스트 0개 시 "등록된 뉴스가 없습니다" + 설명 + 커뮤니티 보러가기 링크.
- `#page-root`는 `.card` 내부에 있어 EmptyState가 동일 container 안에서 표시됨.

---

## 5. 완료 조건 체크

- 계산기·뉴스·PG·커뮤니티에서 초록 박스(`.hero-green`)의 시작 위치(y), 좌우 정렬, 폭, padding, radius, 내부 타이포 동일 (토큰/컴포넌트로만 제어).
- 375/768/1280에서 여백·정렬 동일하게 유지 (토큰 반응형).
- 헤더 검색 중복 텍스트 0 (placeholder 하나, 버튼 "검색").
- 커뮤니티 검색 뭉개짐 0 (input·버튼 분리, flex gap·min-width).
- 뉴스 빈 페이지: EmptyState/리스트 표시 유지.
