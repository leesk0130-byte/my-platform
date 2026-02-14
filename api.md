# 가맹점숲 — 서버 API 명세

서버(Firebase/Node 등)를 붙일 때 아래 엔드포인트를 구현하면 프론트가 그대로 동작합니다.

---

## 1. 뉴스 (온라인 쇼핑몰 관련) — 실시간 연동

**권장**: 네이버 개발자센터에서 **뉴스 검색 API**를 발급받아, 서버에서 주기적으로(또는 요청 시) 다음 키워드로 검색한 뒤 결과를 아래 형식으로 가공해 반환하세요.
- 검색 키워드 예: `온라인쇼핑몰`, `쇼핑몰 가맹점`, `PG 수수료`, `전자상거래`, `전자상거래법` 등
- [네이버 검색 API (뉴스)](https://developers.naver.com/docs/serviceapi/search/news/news.md) 사용
- 클라이언트는 브라우저에서 직접 Naver API를 호출할 수 없으므로(CORS·API 키 노출) **반드시 서버에서 proxy**하여 `GET /api/news`로 제공해야 함.

- **GET** `/api/news?limit=20&offset=0`
- **응답**
```json
{
  "items": [
    {
      "id": "string",
      "title": "뉴스 제목",
      "link": "https://...",
      "summary": "요약 (선택)",
      "date": "2025-02-11",
      "source": "출처명 (선택)",
      "badge": "뉴스|정책|지원|가이드 (선택)"
    }
  ],
  "total": 100
}
```

---

## 2. 커뮤니티 게시글

- **GET** `/api/community/posts?board=all|free|fee|qna|info&limit=20&offset=0`
- **응답**
```json
{
  "items": [
    {
      "id": "string",
      "title": "제목",
      "author": "닉네임 또는 이메일",
      "authorId": "string (선택)",
      "date": "2025-02-11T12:00:00",
      "hits": 42,
      "board": "free"
    }
  ],
  "total": 50
}
```

- **GET** `/api/community/posts/:id` — 게시글 상세
- **POST** `/api/community/posts` — 글 작성 (인증 필요)
  - Body: `{ "title": "...", "body": "...", "board": "free" }`
  - Header: `Authorization: Bearer <token>`

---

## 3. 인증

- **POST** `/api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
  - 응답: `{ "token": "jwt...", "user": { "id", "email", "name" } }`

- **POST** `/api/auth/signup`
  - Body: `{ "name": "...", "email": "...", "password": "..." }`
  - 응답: `{ "token": "...", "user": { ... } }` 또는 201

- **POST** `/api/auth/logout` (선택)
- **GET** `/api/auth/me` — 현재 로그인 사용자 (Header: `Authorization: Bearer <token>`)

---

## 4. CORS

브라우저에서 다른 도메인으로 요청할 경우 서버에서 CORS 허용 필요.

- `Access-Control-Allow-Origin`: 프론트 도메인 또는 `*`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization`

---

## 5. 프론트 설정

- `js/config.js`의 `window.API_BASE_URL`을 서버 주소로 두면 됨 (같은 도메인이면 `''` 유지).
