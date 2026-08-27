#!/usr/bin/env bash
# CSIN-Tech 메신저 — 거래처 GW 서버(192.168.123.210) 배포
# 사용: 9210 RDP로 서버 접속 후, 이 저장소를 clone/복사한 뒤 실행
#   cp .env.partner.example .env   # 계정·JWT 채운 뒤
#   ./scripts/deploy-partner-server.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env 없음. cp .env.partner.example .env 후 PARTNER_MSSQL_* / JWT_SECRET 채우세요."
  exit 1
fi

echo "==> docker compose build & up"
docker compose up -d --build

echo "==> wait for API"
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:3001/" >/dev/null; then
    echo "API up"
    break
  fi
  sleep 2
  if [[ $i -eq 30 ]]; then
    echo "ERROR: API did not become ready"
    docker compose logs --tail=80 server
    exit 1
  fi
done

echo "==> partner org sync (departments + create users)"
docker compose exec -T server npm run partner:org:sync:users || \
  docker compose exec -T server node scripts/sync-partner-org.js --create-users

echo "==> done"
echo "사내 확인: curl http://192.168.123.210:3001/"
echo "사외 확인: UTM 3001 오픈 후 curl http://121.143.3.163:3001/"
echo "클라이언트: CSIN-Tech-Setup-*.exe (기본 API http://121.143.3.163:3001)"
