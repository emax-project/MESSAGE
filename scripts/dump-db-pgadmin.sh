#!/usr/bin/env bash
# pgAdmin에서 실행 가능한 덤프 (COPY 대신 INSERT 사용). 프로젝트 루트에서 실행
# 사용: ./scripts/dump-db-pgadmin.sh  → scripts/dump_YYYYMMDD_HHMM_pgadmin.sql

set -e
cd "$(dirname "$0")/.."
OUT="scripts/dump_$(date +%Y%m%d_%H%M)_pgadmin.sql"
docker compose exec -T db pg_dump -U message -d message --no-owner --clean --if-exists -F p --inserts > "$OUT"
# \restrict 줄 제거 (pgAdmin이 인식 못함)
sed -i '' '/^\\restrict/d' "$OUT" 2>/dev/null || sed -i '/^\\restrict/d' "$OUT" 2>/dev/null || true
echo "덤프 완료 (pgAdmin용): $OUT"
