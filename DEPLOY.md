# 가맹점숲 — 서버(배포) 정확한 순서 (개발 몰라도 따라 하기)

개발을 몰라도 **이 순서대로만** 하면 됩니다.  
조코딩처럼 **1. Cloudflare 등록 → 2. GitHub 연동 → 3. Firebase** 순서입니다.

---

## 전체 순서 한 줄 요약

1. **GitHub** = 내 코드를 인터넷에 올려두는 창고 만드는 것  
2. **Cloudflare** = 그 창고를 보고 **진짜 사이트 주소**(예: https://xxx.pages.dev)로 열어 주는 것  
3. **Firebase** = 로그인·회원가입·글 저장을 **진짜로** 쓰려면 나중에 설정하는 것  

**“일단 사이트만 주소로 열리게”** 하려면 → **1번 + 2번**만 하면 됩니다.

---

# 1단계: GitHub (코드 올려두기)

**목적**: 지금 컴퓨터에 있는 가맹점숲 폴더를, GitHub라는 사이트에 “저장소”로 올려 둡니다.  
나중에 Cloudflare가 이 저장소를 보고 사이트를 만들어 줍니다.

## 1-1. GitHub 가입 (이미 있으면 건너뛰기)

1. 브라우저에서 **https://github.com** 접속  
2. **Sign up** 클릭  
3. 이메일, 비밀번호, 사용자 이름 입력해서 가입  
4. 이메일 인증까지 끝내기  

**기억할 것**: 가입할 때 정한 **사용자 이름**(예: `hong-gil-dong`) → 나중에 주소에 씁니다.

## 1-2. GitHub에 “저장소” 만들기

1. **https://github.com** 접속 후 로그인  
2. **오른쪽 위** 초록색 **New** 버튼 클릭  
   (또는 **+** 아이콘 → **New repository**)  
3. 아래처럼 **정확히** 입력/선택  
   - **Repository name**: `my-platform` (그대로 입력)  
   - **Public** 선택  
   - **Add a README file** 체크 **하지 않기** (비워 둔 채로)  
4. 맨 아래 **Create repository** 클릭  

→ 화면에 “Quick setup” 같은 글이 나오면 성공.  
→ 주소가 **https://github.com/내사용자이름/my-platform** 형태입니다. **내사용자이름**을 메모해 두세요.

## 1-3. 내 컴퓨터 코드를 GitHub에 올리기 (터미널에서)

**터미널** = Cursor 아래쪽 **TERMINAL** 탭, 또는 Windows **명령 프롬프트**를 연 상태에서  
**반드시 “my-platform 폴더 안”**에서 해야 합니다.

1. **Cursor**에서 **my-platform** 프로젝트 열어 두기  
2. 아래쪽 **TERMINAL** 탭 클릭  
3. 아래 명령어를 **한 줄씩** 복사해서 붙여 넣고 **Enter** 치기  
   - `내사용자이름`은 **1-2에서 메모한 GitHub 사용자 이름**으로 바꾸세요.

```bash
git init
```
Enter 누름.

```bash
git add .
```
Enter 누름.

```bash
git commit -m "첫 커밋"
```
Enter 누름.

```bash
git branch -M main
```
Enter 누름.

```bash
git remote add origin https://github.com/내사용자이름/my-platform.git
```
**여기서 `내사용자이름`을 본인 GitHub 아이디로 바꾼 뒤** Enter 누름.

```bash
git push -u origin main
```
Enter 누름.  
→ **GitHub 로그인** 창이 뜨면 로그인하거나, **Personal access token** 쓰라고 나오면 GitHub에서 토큰 만들어서 비밀번호 자리에 붙여 넣기.

끝나면 GitHub 사이트에서 **https://github.com/내사용자이름/my-platform** 페이지를 새로고침했을 때 **폴더/파일 목록**이 보이면 **1단계 완료**입니다.

---

# 2단계: Cloudflare (사이트 주소로 열리게 하기)

**목적**: GitHub에 올린 코드를 **실제 사이트 주소**(예: https://my-platform-xxxx.pages.dev)로 누구나 볼 수 있게 합니다.

## 2-1. Cloudflare 가입

1. 브라우저에서 **https://dash.cloudflare.com/sign-up** 접속  
2. 이메일, 비밀번호 입력해서 가입  
3. 이메일 인증까지 끝내기  

## 2-2. Cloudflare Pages로 “GitHub 연결” 하기

1. Cloudflare 대시보드 왼쪽 메뉴에서 **Workers & Pages** 클릭  
2. **Create** 버튼 클릭  
3. **Pages** 선택  
4. **Connect to Git** 선택  
5. **GitHub**가 보이면 **Connect GitHub** 클릭  
   - GitHub 로그인/권한 허용 창이 나오면 **Authorize** 등 허용  
6. **저장소 선택** 화면에서 **my-platform** 선택  
   - 안 보이면 **Configure GitHub App**에서 my-platform 저장소 허용 후 다시 선택  
7. **Begin setup** 클릭  

## 2-3. 빌드 설정 (그대로 입력하면 됨)

다음처럼 **정확히** 입력합니다.

| 항목 | 입력할 값 |
|------|-----------|
| **Project name** | `my-platform` (또는 원하는 영어 이름) |
| **Production branch** | `main` (그대로 두기) |
| **Build command** | **비우기** (아무것도 입력 안 함) |
| **Build output directory** | ` / ` (슬래시 하나만, 또는 `.` 하나만) |

**Root directory**는 비워 둡니다.

맨 아래 **Save and Deploy** 클릭.

## 2-4. 완료

1~2분 기다리면 **Deploy 성공**이라고 나옵니다.  
**Visit site** 또는 **사이트 주소**를 클릭하면 **가맹점숲 사이트가 인터넷 주소로** 열립니다.  
주소는 예: **https://my-platform-xxxx.pages.dev** 같은 형태입니다.  
이 주소를 **메모해 두면** 나중에 누구에게나 “여기 들어가 보세요” 하고 줄 수 있습니다.

**여기까지 하면 “서버 개설 + 사이트 공개”는 끝입니다.**

---

# 3단계: Firebase (나중에 — 로그인·DB 쓰려면)

**지금 당장 사이트만 열리게 하려면 3단계는 안 해도 됩니다.**

**언제 하면 되나요?**  
- 로그인·회원가입을 **진짜로** 동작하게 하거나  
- 게시글·댓글을 **서버에 저장**하게 하고 싶을 때  

그때 **Firebase Console**(웹사이트)에서 설정합니다.  
(조코딩에서 말한 “Firebase”는 **Firebase Console** = https://console.firebase.google.com 입니다. “Firebase Studio”가 아니라 **Console**에서 합니다.)

## 3-1. Firebase 가입

1. **https://console.firebase.google.com** 접속  
2. Google 계정으로 로그인  

## 3-2. 프로젝트 만들기

1. **프로젝트 추가** 클릭  
2. 프로젝트 이름: `my-platform` (또는 원하는 이름)  
3. Google Analytics는 **끄기** 또는 **켜기** 아무거나 선택 후 **프로젝트 만들기**  

## 3-3. 웹 앱 등록

1. 프로젝트 들어간 뒤 **</> 웹** 아이콘 클릭  
2. 앱 닉네임 아무거나 입력 (예: `가맹점숲 웹`)  
3. **앱 등록** 클릭  
4. 나오는 **firebaseConfig** 안의 값들(apiKey, authDomain 등)은 **복사해서 따로 메모**  
   → 나중에 “Firebase 연동해줘”라고 하면 그때 **js/config.js** 같은 곳에 넣어 달라고 하시면 됩니다.  

## 3-4. 로그인(인증) 켜기

1. 왼쪽 **Build** → **Authentication** 클릭  
2. **시작하기** 클릭  
3. **Sign-in method** 탭에서 **이메일/비밀번호** 한 줄 클릭  
4. **사용** 켜기 → **저장**  

5. **승인된 도메인** (필수): 사이트를 **my-platform.pages.dev** 로 배포했다면, Firebase **Authentication** → **설정** 탭 → **승인된 도메인**에 `my-platform.pages.dev` 를 추가해 두어야 로그인/회원가입이 됩니다.

→ 이렇게 해 두면 나중에 코드에서 “Firebase 로그인 쓰자”고 바꿀 때, 백엔드 준비는 된 상태입니다.

**Firestore(DB)** 나 **실제 코드 연동**은 “Firebase 연동 코드 작성해줘”라고 하시면 그때 단계별로 도와드리겠습니다.

---

## 정리: 지금 당장 할 일만

| 순서 | 할 일 | 어디서 |
|------|--------|--------|
| 1 | GitHub 가입 → 저장소 `my-platform` 만들기 | github.com |
| 2 | Cursor 터미널에서 `git init` ~ `git push` 까지 실행 | Cursor 하단 TERMINAL |
| 3 | Cloudflare 가입 → Workers & Pages → Connect to Git → my-platform 선택 | dash.cloudflare.com |
| 4 | Build command 비우고, Build output directory에 `/` 입력 → Save and Deploy | 같은 화면 |
| 5 | 완료 후 나온 **사이트 주소** 메모 (예: https://my-platform-xxxx.pages.dev) | Visit site 클릭 |

**1~5까지 하면 “서버 개설 + 주소로 사이트 열기”는 끝입니다.**  
궁금한 단계가 있으면 “2단계 Cloudflare에서 저장소가 안 보여요”처럼 **몇 단계에서 무엇이 안 되는지** 말해 주시면, 그 부분만 더 정확히 적어 드리겠습니다.
