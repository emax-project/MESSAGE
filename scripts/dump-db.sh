#!/usr/bin/env bash
# 로컬 Docker Postgres DB를 덤프합니다. (프로젝트 루트에서 실행)
# 사용: ./scripts/dump-db.sh  → scripts/dump_YYYYMMDD_HHMM.sql 생성

set -e
cd "$(dirname "$0")/.."
OUT="scripts/dump_$(date +%Y%m%d_%H%M).sql"
docker compose exec -T db pg_dump -U message -d message --no-owner --clean --if-exists -F p > "$OUT"
echo "덤프 완료: $OUT"
