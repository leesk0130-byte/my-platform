# bizimshop.co.kr 도메인 연결 (가비아 + Cloudflare Pages)

사이트 코드에는 이미 **bizimshop.co.kr** 이 반영되어 있습니다. 아래 두 곳만 설정하면 됩니다.

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
| **CNAME** | **@** (또는 비워두기, 루트 도메인) | **my-platform.pages.dev** |
| **CNAME** | **www** | **my-platform.pages.dev** (선택: www도 쓰려면) |

- **@** = 메인 도메인(bizimshop.co.kr)
- **www** = www.bizimshop.co.kr
- 일부 레지스트라에서는 루트(@)에 CNAME을 지원하지 않습니다. 그럴 경우 **A 레코드**로 Cloudflare IP를 쓰거나, 가비아 안내에 따라 **URL 리다이렉트**로 www → 루트 처리할 수 있습니다.

---

## 3. 반영 시간

- DNS 전파: 10분 ~ 24시간
- Cloudflare에서 SSL 발급: 보통 몇 분 이내

---

## 4. 연결 후 확인

- https://bizimshop.co.kr 접속
- https://bizimshop.co.kr/ads.txt (AdSense용)
- Google Search Console·AdSense에 **bizimshop.co.kr** 도메인 추가

---

## 5. Firebase/기타 서비스

- **Firebase Authentication** 사용 중이면: **승인된 도메인**에 `bizimshop.co.kr` 추가 (DEPLOY.md 참고)
- **Google Search Console**: 속성으로 `https://bizimshop.co.kr` 추가 후 소유권 확인
