# TPA코리아 — 이맥스 자체 서버(Windows, 114.203.209.5) 배포
# (거래처 서버 아님 — 이맥스가 직접 관리하는 서버. 공인 IP 직접 보유, NAT/포트포워딩 불필요)
# RDP(114.203.209.5:4405, administrator) 접속 후 PowerShell(관리자)에서 실행:
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\scripts\deploy-partner-server.ps1
#
# 사전:
#   - Docker Desktop(또는 Docker Engine) 설치, Git 설치
#   - 설치 경로: G드라이브(용량 여유 있는 곳) 권장, 예: G:\MESSAGE
#   - 방화벽: netsh advfirewall firewall add rule name="Messenger API 3001" dir=in action=allow protocol=TCP localport=3001
#   cd G:\MESSAGE
#   copy .env.partner.example .env
#   # .env 에 JWT_SECRET, PARTNER_MSSQL_PASSWORD 입력 (ADMIN_EMAIL/COMPANY_NAME은 기본값 채워둠)
#   # PARTNER_MSSQL_DATABASE는 RDP 접속 후 실제 DB명으로 채울 것 (sa로 조회)
#   # PARTNER_MSSQL_SERVER: DB가 이 서버와 같은 호스트면 localhost로 바꿔도 됨 (RDP 접속 후 확인)

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
Write-Host "접속: http://114.203.209.5:3001/ (공인 IP 직접 보유 — 사내/사외 동일 주소)"
Write-Host "방화벽 인바운드 3001 열려있는지 확인: netsh advfirewall firewall show rule name=`"Messenger API 3001`""
Write-Host "클라이언트 기본 URL: http://114.203.209.5:3001"
