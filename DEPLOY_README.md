# 푸시가 한 번에 적용되지 않던 원인과 수정 사항

## 원인

1. **한글 경로**  
   프로젝트가 `OneDrive\바탕 화면\my-platform` 에 있어서, 터미널에서 `Set-Location` 이나 `git -C "절대경로"` 로 이 경로를 지정하면 인코딩 문제로 실패할 수 있음.

2. **터미널이 다른 폴더에서 열림**  
   터미널이 프로젝트 루트가 아니라 다른 디렉터리(예: gxp 워크트리)에서 열려 있으면, `git add` / `git commit` / `git push` 가 **그 폴더**에서 실행됨.  
   → 수정한 파일은 OneDrive 쪽인데, 푸시는 gxp(pushfix) 쪽에서 되어 배포(main)에 반영되지 않음.

3. **워크트리 두 개**  
   - **메인 저장소**: `OneDrive\바탕 화면\my-platform` (main 브랜치) → 여기서 푸시해야 배포 반영  
   - **gxp 워크트리**: `.cursor\worktrees\my-platform\gxp` (pushfix 브랜치)  
   gxp에서 푸시하면 pushfix만 올라가고, Cloudflare 등이 main을 배포 중이면 사이트에는 반영되지 않음.

## 수정 사항

1. **`.vscode/settings.json`**  
   - `"terminal.integrated.cwd": "${workspaceFolder}"`  
   - Cursor에서 **새 터미널**을 열면 기본 작업 디렉터리가 프로젝트 루트(메인 저장소)가 되도록 설정.

2. **`push.ps1`**  
   - worktree인지 검사: 이 스크립트를 **gxp에서 실행하면** “worktree입니다. 메인 저장소에서 실행하세요”라고 경고하고 종료.  
   - 메인 저장소에서만 `git add` → `commit` → `push` 가 실행되도록 유도.

3. **`.cursor/rules/deploy.mdc`**  
   - 푸시 시 **다른 디렉터리로 cd 하지 말고**, 터미널이 이미 프로젝트 루트에 있다고 가정하고 `.\push.ps1 "커밋 메시지"` 만 실행하도록 규칙 수정.

## 사용 방법 (한 번에 푸시하려면)

1. Cursor에서 이 프로젝트(OneDrive 폴더)를 연 상태에서 **새 터미널**을 연다.  
   → 자동으로 프로젝트 루트에서 열림.
2. 코드 수정 후 푸시할 때:  
   `.\push.ps1 "커밋 메시지"`  
   (메시지 생략 시 `.\push.ps1` 만 실행해도 됨.)
3. **푸시하기 전에 `cd` 로 다른 폴더로 이동하지 않는다.**

이렇게 하면 수정한 코드가 메인 저장소에서 main으로 푸시되어, 배포가 한 번에 적용된다.
