# bizimshop.co.kr 도메인 연결 (가비아 + Cloudflare Pages)

사이트 코드에는 이미 **bizimshop.co.kr** 이 반영되어 있습니다. 아래 두 곳만 설정하면 됩니다.

---

## 지금 바로 하기 — 가비아 DNS (지금 보시는 화면)

지금 **레코드 개수 0개** 상태인 화면에서 아래만 하면 됩니다.

### 1) 첫 번째 줄 (이미 있는 빈 줄 사용)

| 넣는 곳 | 입력할 값 |
|--------|-----------|
| **타입** | 드롭다운에서 **CNAME** 선택 |
| **호스트** | **@** (또는 비워두기. `@.bizimshop.co.kr` 이면 @만 남기기) |
| **값/위치** | **my-platform.pages.dev.** (끝에 점(.) 붙이기. 가비아는 점으로 끝나야 함) |
| **TTL** | 180 그대로 두기 |

- **우선 순위** / **서비스** 는 비워두거나 기본값 그대로 두세요.

### 2) 저장

맨 아래 파란 **저장** 버튼 누르기.

---

**참고:** 호스트 **@** 에 CNAME을 막아둔 경우가 있습니다. 그때는  
- **호스트**에 **www** 만 넣고 **값/위치**에 **my-platform.pages.dev.** (끝에 점) 넣어서 저장한 뒤,  
- 가비아 도메인 메뉴에서 **URL 리다이렉트**(또는 **도메인 연결/이동**)로 `bizimshop.co.kr` → `www.bizimshop.co.kr` 로 연결하면 됩니다.

위까지 하신 뒤 **Cloudflare** 설정(아래 1번)도 해야 **bizimshop.co.kr** 로 접속됩니다.

---

## 1. Cloudflare Pages에서 커스텀 도메인 추가

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인
2. **Workers & Pages** → **my-platform** 프로젝트 클릭
3. **Custom domains** 탭 → **Set up a custom domain**
4. 입력: **bizimshop.co.kr** (www 없이)
5. 추가 후 Cloudflare가 안내하는 **CNAME 대상** 확인  
   - 보통 `my-platform.pages.dev` 입니다.

---

## 2. 가비아 DNS 설정

1. [가비아](https://www.gabia.com) 로그인 → **MY가비아** → **도메인 관리**
2. **bizimshop.co.kr** 선택 → **DNS 관리** / **DNS 설정**
3. 아래 레코드 추가 또는 수정:

| 유형 | 호스트 | 값/위치 |
|------|--------|---------|
| **CNAME** | **@** (또는 비워두기, 루트 도메인) | **my-platform.pages.dev.** (가비아는 끝에 점 필수) |
| **CNAME** | **www** | **my-platform.pages.dev.** (선택: www도 쓰려면) |

- **@** = 메인 도메인(bizimshop.co.kr)
- **www** = www.bizimshop.co.kr
- 일부 레지스트라에서는 루트(@)에 CNAME을 지원하지 않습니다. 그럴 경우 **A 레코드**로 Cloudflare IP를 쓰거나, 가비아 안내에 따라 **URL 리다이렉트**로 www → 루트 처리할 수 있습니다.

---

## 3. 반영 시간

- DNS 전파: 10분 ~ 24시간
- Cloudflare에서 SSL 발급: 보통 몇 분 이내

---

## 4. "도메인 추가(Add site)"로 진행한 경우 — 지금 화면에서

1. **Enter an existing domain** 칸에 **bizimshop.co.kr** 입력 (example.com 지우고).
2. **Quick scan for DNS records** 그대로 선택.
3. **Block AI training bots** / robots.txt 토글은 그대로 두고 **Continue** (또는 다음) 클릭.
4. 다음 화면에서 Cloudflare가 가비아 DNS를 스캔해서 레코드를 보여주면 **그대로 두고** 다시 **Continue**.
5. 요금제 선택 화면이 나오면 **Free** 선택 후 **Continue**.
6. **네임서버 안내 화면**이 나옵니다. 여기서 **두 개의 주소**가 나옵니다. 예:
   - `xxx.ns.cloudflare.com`
   - `yyy.ns.cloudflare.com`
7. **가비아로 이동**  
   - MY가비아 → 도메인 관리 → **bizimshop.co.kr** → **네임서버 변경** (또는 DNS 서버 설정).
   - 기존 네임서버를 **지우고**, Cloudflare에서 복사한 **두 개**를 넣고 저장.
8. Cloudflare 화면으로 돌아와서 **Done, check nameservers** (또는 네임서버 확인) 클릭.  
   - 전파까지 최대 24시간 걸릴 수 있음 (보통 수 분~몇 시간).
9. **연결이 완료된 뒤**, Cloudflare DNS에 **CNAME**이 있어야 사이트가 뜹니다.  
   - Cloudflare 대시보드 → **bizimshop.co.kr** → **DNS** → **Records**.  
   - **@** 또는 **bizimshop.co.kr** 에 대한 **CNAME**이 **my-platform.pages.dev** 를 가리키는지 확인.  
   - 없으면 **Add record** → 타입 **CNAME**, 이름 **@**, Target **my-platform.pages.dev** (끝에 점 있으면 **my-platform.pages.dev.**) 저장.
10. **Pages에 커스텀 도메인 등록**  
    - **Workers & Pages** → **my-platform** → **Custom domains** → **Set up a custom domain** → **bizimshop.co.kr** 입력 후 추가.  
    - 이렇게 해야 bizimshop.co.kr 로 접속 시 실제로 Pages 사이트가 열립니다.

---

## 5. 연결 후 확인

- https://bizimshop.co.kr 접속
- https://bizimshop.co.kr/ads.txt (AdSense용)
- Google Search Console·AdSense에 **bizimshop.co.kr** 도메인 추가

---

## 6. Firebase/기타 서비스

- **Firebase Authentication** 사용 중이면: **승인된 도메인**에 `bizimshop.co.kr` 추가 (DEPLOY.md 참고)
- **Google Search Console**: 속성으로 `https://bizimshop.co.kr` 추가 후 소유권 확인
