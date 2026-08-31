# CSIN-Tech — 거래처 GW 서버(Windows, 192.168.123.210) 배포
# RDP(121.143.3.163:9210) 접속 후 PowerShell(관리자)에서 실행:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\scripts\deploy-partner-server.ps1
#
# 사전: Docker Desktop(또는 Docker Engine) 설치, Git 설치, 이 저장소 clone
#   cd C:\MESSAGE
#   copy .env.partner.example .env
#   # .env 에 JWT_SECRET, PARTNER_MSSQL_USER/PASSWORD, ADMIN_EMAIL 입력
#   # 거래처 망: PARTNER_MSSQL_SERVER=192.168.123.211 , PORT=1433

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Test-Path ".env")) {
  Write-Error ".env 없음. copy .env.partner.example .env 후 값을 채우세요."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Error "docker 명령을 찾을 수 없습니다. Docker Desktop을 설치·실행하세요."
}

Write-Host "==> docker compose up -d --build"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "docker compose failed" }

Write-Host "==> wait for API http://127.0.0.1:3001/"
$ok = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:3001/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -ge 200) { $ok = $true; break }
  } catch { Start-Sleep -Seconds 2 }
}
if (-not $ok) {
  docker compose logs --tail 80 server
  throw "API did not become ready"
}
Write-Host "API up"

Write-Host "==> partner org sync (create users)"
docker compose exec -T server npm run partner:org:sync:users
if ($LASTEXITCODE -ne 0) {
  docker compose exec -T server node scripts/sync-partner-org.js --create-users
}

Write-Host "==> done"
Write-Host "사내: http://192.168.123.210:3001/"
Write-Host "사외: http://121.143.3.163:3030/  (UTM 1442: 3030→210:3001)"
Write-Host "클라이언트 기본 URL: http://121.143.3.163:3030"
