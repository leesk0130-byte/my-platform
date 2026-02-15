# 코드 수정 후 커밋 & 푸시 (한 번에 실행)
# 사용: PowerShell에서 .\push.ps1 또는 .\push.ps1 "커밋 메시지"
$msg = $args[0]
if (-not $msg) { $msg = "코드 수정 반영" }
Set-Location $PSScriptRoot
git add -A
git status -s
if ($LASTEXITCODE -ne 0) { Write-Host "git add 실패"; exit 1 }
$count = (git status -s | Measure-Object -Line).Lines
if ($count -eq 0) { Write-Host "커밋할 변경 없음"; exit 0 }
git commit -m $msg
if ($LASTEXITCODE -ne 0) { Write-Host "커밋 실패"; exit 1 }
git push
if ($LASTEXITCODE -ne 0) { Write-Host "푸시 실패 (origin 확인)"; exit 1 }
Write-Host "커밋 & 푸시 완료"
