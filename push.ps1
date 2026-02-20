# 코드 수정 후 커밋 & 푸시 (한 번에 실행)
# 사용: .\push.ps1 또는 .\push.ps1 "커밋 메시지"
# 또는 (어느 디렉터리에서든): & "C:\Users\leesk\OneDrive\바탕 화면\my-platform\push.ps1" "메시지"
$ErrorActionPreference = "Stop"
$msg = $args[0]
if (-not $msg) { $msg = "코드 수정 반영" }

# 메인 저장소 경로 = 스크립트가 있는 폴더 (한글 경로여도 $PSScriptRoot는 정상)
$RepoRoot = $PSScriptRoot
$GitDir = Join-Path $RepoRoot ".git"

# worktree가 아닌 메인 저장소인지 확인 (.git이 파일이면 worktree)
$gitItem = Get-Item $GitDir -Force -ErrorAction SilentlyContinue
$isWorktree = $gitItem -and -not $gitItem.PSIsContainer
if ($isWorktree) {
  Write-Host "경고: 이 스크립트는 worktree가 아닌 메인 저장소에만 있습니다. 메인 저장소(OneDrive)의 push.ps1 을 실행하세요." -ForegroundColor Yellow
  exit 1
}

# cwd 무관하게 항상 메인 저장소에서 git 실행 (한글 경로 cd 실패 대비)
function Run-Git {
  $argList = @("--git-dir=$GitDir", "--work-tree=$RepoRoot") + $args
  & git @argList
}

$branch = Run-Git rev-parse --abbrev-ref HEAD 2>$null
Write-Host "저장소: $RepoRoot" -ForegroundColor Gray
Write-Host "브랜치: $branch" -ForegroundColor Cyan

Run-Git add -A
Run-Git status -s
if ($LASTEXITCODE -ne 0) { Write-Host "git add 실패"; exit 1 }
$count = (Run-Git status -s | Measure-Object -Line).Lines
if ($count -eq 0) { Write-Host "커밋할 변경 없음"; exit 0 }
Run-Git commit -m $msg
if ($LASTEXITCODE -ne 0) { Write-Host "커밋 실패"; exit 1 }
Run-Git push
if ($LASTEXITCODE -ne 0) { Write-Host "푸시 실패 (origin 확인)"; exit 1 }
Write-Host "커밋 & 푸시 완료 (main 반영)"
