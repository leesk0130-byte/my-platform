# bizimshop.co.kr 도메인 정규화 및 리디렉션 가이드

대표 도메인: **https://bizimshop.co.kr** (비-www, HTTPS)

---

## 1. 원인 가설

| 현상 | 원인 가설 |
|------|-----------|
| GSC "리디렉션이 포함된 페이지" | http→https 또는 www→비www 리디렉션이 있어서, Google이 최종 URL(https://bizimshop.co.kr)만 색인하도록 유도 중. 리디렉션 설정이 없으면 http/www 버전이 따로 크롤링되어 중복·혼선 발생. |
| GSC "적절한 표준 태그가 포함된 대체 페이지" | 동일 콘텐츠가 여러 URL(http, https, www, 비www)로 접근 가능한데, canonical은 이미 https://bizimshop.co.kr로 통일됨. 리디렉션이 없으면 Google이 "대체 페이지"로 분류. |
| www 502 | (1) **DNS**: www CNAME/ A 레코드가 없거나 Cloudflare 프록시 비활성화로 오리진에 직접 가서 오리진이 www 호스트를 처리 못함 (2) **오리진**: Cloudflare Pages/서버가 `Host: www.bizimshop.co.kr`만 오면 502 반환 (3) **SSL**: www용 인증서/Full strict 설정 문제. |

---

## 2. Cloudflare에서 바로 수정할 설정

### 2-1. 301 리디렉션 규칙 (우선 적용)

**목표:** 모든 요청이 최종적으로 `https://bizimshop.co.kr/경로` 로 301 리디렉션.

| from | to |
|------|-----|
| `http://bizimshop.co.kr/*` | `https://bizimshop.co.kr/$1` |
| `http://www.bizimshop.co.kr/*` | `https://bizimshop.co.kr/$1` |
| `https://www.bizimshop.co.kr/*` | `https://bizimshop.co.kr/$1` |

**Cloudflare에서 클릭 경로:**

1. [Cloudflare 대시보드](https://dash.cloudflare.com/) 로그인
2. **도메인 선택:** `bizimshop.co.kr` 클릭
3. 왼쪽 메뉴 **Rules** → **Redirect Rules** 클릭
4. **Create rule** 클릭
5. **Rule name:** `Canonical: non-www HTTPS` (아무 이름 가능)
6. **When incoming requests match:**  
   - **Field:** `Hostname`  
   - **Operator:** `equals`  
   - **Value:** `www.bizimshop.co.kr`  
   - **Add condition** 한 번 더:  
     - **Field:** `Hostname`  
     - **Operator:** `equals`  
     - **Value:** `bizimshop.co.kr`  
   - 그 다음 **Or** 로 바꾸고, **Scheme** `is` `HTTP` 조건 추가  
   → 최종: `(Hostname equals www.bizimshop.co.kr) OR (Scheme equals HTTP)`  
   (실제로는 아래처럼 2개 규칙으로 나누는 게 더 단순함)
7. **Then the settings are:**  
   - **Type:** Dynamic  
   - **Expression:**  
     - 비-www + HTTPS 로 보내려면:  
       `concat("https://bizimshop.co.kr", http.request.uri.path)`  
     - 또는 **Type:** Static, **URL:** `https://bizimshop.co.kr/$1` (정규식 캡처 사용 시)
8. **Status code:** 301 - Permanent Redirect
9. **Deploy** 클릭

**더 단순한 방법 (권장): 규칙 2개로 분리**

**규칙 1: www → 비-www (HTTPS 포함)**  
- **If:** `(http.host eq "www.bizimshop.co.kr")`  
- **Then:** Dynamic redirect →  
  - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status code:** 301  

**규칙 2: HTTP → HTTPS**  
- **If:** `(http.request.scheme eq "http")`  
- **Then:** Dynamic redirect →  
  - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status code:** 301  

(규칙 2만으로도 `http://bizimshop.co.kr`와 `http://www.bizimshop.co.kr`는 HTTPS로 먼저 넘어가고, 규칙 1이 www를 비-www로 보냄. 순서: HTTP→HTTPS 먼저, 그 다음 www→비-www.)

**실제 입력 예 (Redirect Rules UI):**

- **Rule 1**  
  - **When:** Custom filter expression  
  - **Expression:** `(http.host eq "www.bizimshop.co.kr")`  
  - **Then:** URL Redirect, Dynamic,  
    - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status code:** 301  

- **Rule 2**  
  - **When:** Custom filter expression  
  - **Expression:** `(http.request.scheme eq "http")`  
  - **Then:** URL Redirect, Dynamic,  
    - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status code:** 301  

쿼리 스트링도 유지하려면:  
`concat("https://bizimshop.co.kr", http.request.uri.path, if(length(http.request.uri.query) > 0, concat("?", http.request.uri.query), ""))`

**복사해서 쓸 표현식 (Redirect Rules):**

- **규칙 1 – www 제거**  
  - **If:** `(http.host eq "www.bizimshop.co.kr")`  
  - **Redirect to:** Dynamic  
  - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status:** 301  

- **규칙 2 – HTTP → HTTPS**  
  - **If:** `(http.request.scheme eq "http")`  
  - **Redirect to:** Dynamic  
  - **Expression:** `concat("https://bizimshop.co.kr", http.request.uri.path)`  
  - **Status:** 301  

규칙 순서: **규칙 1(www)을 위에**, **규칙 2(http)를 그 다음**에 두면 됨.

---

### 2-2. SSL/TLS 확인

**클릭 경로:**  
**SSL/TLS** → **Overview**

- **SSL/TLS encryption mode:** **Full** 또는 **Full (strict)** 권장 (오리진이 HTTPS 지원 시 Full strict)
- **Always Use HTTPS:** **On** (추가로 HTTP→HTTPS 강제)

**Edge Certificates:**  
- **Always Use HTTPS:** On  
- **Automatic HTTPS Rewrites:** On (선택)

---

### 2-3. DNS 확인 (www 502 방지)

**클릭 경로:** **DNS** → **Records**

- **bizimshop.co.kr**  
  - 타입 A 또는 CNAME, Cloudflare 프록시(주황색 구름) **Proxied**
- **www.bizimshop.co.kr**  
  - CNAME → `bizimshop.co.kr` 또는 Pages/오리진 호스트명, **Proxied**

www 레코드가 없거나 **DNS only**(회색 구름)이면, 브라우저가 오리진 IP로 직접 가서 오리진이 `Host: www.bizimshop.co.kr`를 처리 못 할 수 있음 → 502.  
**www도 Proxied로 두고**, 리디렉션 규칙에서 301로 비-www로 보내는 구성이 안전.

---

## 3. www 502 원인 후보 정리

| 후보 | 설명 | 확인 방법 |
|------|------|-----------|
| DNS 레코드 누락 | www A/CNAME 없음 | DNS 탭에서 `www` 레코드 존재·Proxied 여부 확인 |
| 오리진이 www 미지원 | Pages/서버가 `Host: www.bizimshop.co.kr`만 오면 502 | 브라우저에서 https://www.bizimshop.co.kr 접속 시 502면, 리디렉션 규칙이 적용되기 전에 오리진이 응답하는 경우일 수 있음. 리디렉션 규칙을 넣으면 Cloudflare가 먼저 301을 반환하므로 502는 사라져야 함. |
| SSL 설정 | Full strict인데 오리진에 www용 인증 없음 | SSL 모드를 Full로 완화하거나, 오리진에 와일드카드/www 인증서 설정 |

**조치:** 위 2-1 리디렉션 규칙을 넣으면, www 요청은 Cloudflare 단에서 301로 처리되므로 오리진까지 가지 않음. 502는 해소되는 경우가 많음.

---

## 4. canonical 태그 통일 확인 방법

- **사이트 내:**  
  모든 HTML에  
  `<link rel="canonical" href="https://bizimshop.co.kr/...">`  
  형태로 **https://bizimshop.co.kr** 만 사용하는지 검색. (현재 코드베이스는 이미 통일됨.)
- **검증:**  
  - 브라우저에서 `https://bizimshop.co.kr/news.html` 등 열고 개발자도구 → Elements에서 `rel="canonical"` 검색.  
  - 또는 터미널:  
    `curl -sI https://bizimshop.co.kr/`  
    이후 페이지 소스에서 canonical 확인.
- **www나 http URL로 접속한 뒤** 개발자도구 Network에서 최종 리다이렉트 URL이 `https://bizimshop.co.kr/...` 인지 확인.

---

## 5. sitemap, robots.txt, 내부 링크 체크리스트

- [ ] **robots.txt**  
  - `https://bizimshop.co.kr/robots.txt` 에서  
    `Sitemap: https://bizimshop.co.kr/sitemap.xml`  
    한 줄만 있는지(중복 없음), 도메인에 www 없음.
- [ ] **sitemap.xml**  
  - `https://bizimshop.co.kr/sitemap.xml`  
  - 모든 `<loc>` 이 `https://bizimshop.co.kr/...` (비-www)인지.
- [ ] **내부 링크**  
  - 사이트 내 `<a href="...">`, `og:url`, JSON-LD `url` 등에  
    `http://` 또는 `www.bizimshop.co.kr` 없이 `https://bizimshop.co.kr` 만 쓰는지 검색.
- [ ] **Search Console**  
  - **Settings** → **Preferred domain** 없음(Google은 더 이상 이 설정 미제공).  
  - **Sitemaps** 에 `https://bizimshop.co.kr/sitemap.xml` 제출됐는지 확인.

---

## 6. 수정 후 검증 방법

1. **리디렉션 확인**  
   - `curl -sI http://www.bizimshop.co.kr/`  
     → `301` + `Location: https://bizimshop.co.kr/`  
   - `curl -sI https://www.bizimshop.co.kr/`  
     → `301` + `Location: https://bizimshop.co.kr/`  
   - `curl -sI http://bizimshop.co.kr/`  
     → `301` + `Location: https://bizimshop.co.kr/`
2. **최종 응답**  
   - `curl -sI https://bizimshop.co.kr/`  
     → `200` (리디렉션 없음).
3. **브라우저**  
   - http://www.bizimshop.co.kr, http://bizimshop.co.kr, https://www.bizimshop.co.kr 입력 시 주소창이 최종적으로 `https://bizimshop.co.kr` 로 바뀌는지 확인.

---

## 7. Search Console에서 재검사하는 방법

1. [Google Search Console](https://search.google.com/search-console) 접속
2. 속성 **bizimshop.co.kr** (URL 접두어: `https://bizimshop.co.kr`) 선택
3. **URL 검사** (상단 검색창) 클릭
4. 검사할 URL 입력 (예: `https://bizimshop.co.kr/`, `https://www.bizimshop.co.kr/news.html`)
5. **URL 검사 요청** → 크롤링 후 “색인 생성됨” 등 상태 확인
6. **색인 생성 요청** 버튼이 있으면 클릭 (우선순위 재크롤링)
7. **페이지** → **리디렉션** / **canonical** 보고서는 수일 내에 갱신되므로, 며칠 후 다시 확인

---

## 8. 요약 체크리스트

| 항목 | 담당 | 상태 |
|------|------|------|
| Cloudflare Redirect Rules: www → 비-www 301 | Cloudflare | ☐ |
| Cloudflare Redirect Rules: HTTP → HTTPS 301 | Cloudflare | ☐ |
| SSL/TLS: Full 또는 Full (strict) | Cloudflare | ☐ |
| Always Use HTTPS On | Cloudflare | ☐ |
| DNS: www CNAME Proxied | Cloudflare | ☐ |
| canonical 전부 https://bizimshop.co.kr | 코드/배포 | ☐ 완료 |
| sitemap/robots URL 비-www | 코드/배포 | ☐ 완료 |
| curl로 301/200 검증 | 본인 | ☐ |
| GSC URL 검사·색인 생성 요청 | 본인 | ☐ |
