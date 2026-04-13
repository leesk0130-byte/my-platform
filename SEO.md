# SEO & AdSense 재신청 체크리스트

**공개 주소**: https://bizimshop.co.kr (pages.dev 주소는 canonical 에서 제외)

이전 AdSense 심사에서 "가치없는 콘텐츠" 로 거부됨. 원인 추정: 얇은 콘텐츠 / 메타·OG 부실 / 광고 스크립트 미삽입. 아래 항목을 모두 통과한 뒤 재신청한다.

---

## 기술 SEO 기반 (완료)

- [x] `robots.txt` — `/admin.html`, `/admin/`, `/api/` Disallow, 사이트맵 선언
- [x] `sitemap.xml` — 홈/리스트/정책/가이드/필수가이드 전부 포함, `lastmod` 오늘 기준
- [x] `ads.txt` — Google 기본 라인 (pub ID 는 승인 후 교체)
- [x] `js/meta.js` — 모든 페이지에 OG/Twitter/Description/Organization JSON-LD 자동 주입
- [x] 글 상세에 Article JSON-LD (`<body data-post-type="...">` 판별)
- [x] `<html lang="ko">` 강제
- [x] OG 이미지 `/og-image.svg` (1200x630)
- [x] Google Search Console 인증 파일 (`google7b693d8f9106f814.html`) 유지

## 재신청 전 필수 체크 (운영자 액션)

- [ ] 모든 페이지에 `<script src="/js/meta.js" defer></script>` 포함 확인 (홈/리스트/뷰어/어드민 제외 전체)
- [ ] 각 페이지별 **고유한 `<meta name="description">`** 수동 세팅 (meta.js 는 폴백)
- [ ] 각 페이지별 **고유한 `<title>`** (브랜드 suffix 통일: `... | 가맹점숲`)
- [ ] 글 뷰어에서 `data-post-type`, `data-post-published` 속성 렌더
- [ ] 이미지 `alt` 텍스트 전부 채우기
- [ ] 내부 링크 (홈 ↔ 리스트 ↔ 글 상세) 양방향 연결
- [ ] 404/빈 페이지 없음 (기존 정적 HTML 은 pretty URL 로 리다이렉트)

## 콘텐츠 요건 (AdSense 핵심)

- [ ] **최소 20개 이상** 공개된 실질 콘텐츠 (가이드+필수가이드+뉴스 합산)
- [ ] 각 글 **1,500자 이상**, 목차/소제목/예시/표 포함
- [ ] 중복·AI 양산 느낌 금지 — 실제 사례, 수치, 출처 포함
- [ ] About / Contact / 개인정보처리방침 / 이용약관 모두 실제 내용으로 채워짐
- [ ] 연락 가능한 이메일 노출

## AdSense 승인 후

- [ ] `ads.txt` 의 `pub-XXXXXXXXXXXXXXXX` 를 실제 퍼블리셔 ID 로 교체
- [ ] AdSense 본 스크립트 `<head>` 삽입 (`adsbygoogle.js?client=ca-pub-...`)
- [ ] 자동광고 또는 수동 광고 슬롯 배치 (본문 상/중/하)
- [ ] 광고/제휴 고지 페이지 추가

## 검색엔진 등록

- [ ] Google Search Console → `sitemap.xml` 제출, 색인 생성 요청
- [ ] Naver Search Advisor → `sitemap.xml` 제출, `BingSiteAuth.xml` 유지
- [ ] Bing Webmaster Tools → 사이트 추가

## 성능/코어 웹 바이탈

- [ ] Lighthouse Performance ≥ 90
- [ ] LCP < 2.5s, CLS < 0.1
- [ ] 이미지 lazy-load, CSS/JS minify
- [ ] Cloudflare 캐시 룰 확인 (`_headers`)
