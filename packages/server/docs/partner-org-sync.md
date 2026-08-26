# 거래처 MSSQL 조직도 연동 (feature/partner-mssql-org)

## 개요
- 채팅/로그인은 PostgreSQL 유지
- 조직(회사·부서)과 기존 User의 부서 매핑만 거래처 MSSQL(또는 mock)에서 동기화
- 메신저 계정은 **자동 생성하지 않음** (이메일로 매칭된 User만 `departmentId` 갱신)

## 조인 (거래처 스키마)
- 마스터 ↔ INFO / 발령: `hr_employee_master_id`
- 발령 ↔ 부서: `hr_department_code` = `DEPT_TREE_V.DEPT_CD`
- 재직: `retire_date IS NULL` AND `work_state_code = hr009100`
- 현재 발령: `dbo.hr_date_appointment_id(master_id, yyyymmdd)` (실패 시 최신 승인 발령 폴백)

## 환경 변수
`packages/server/.env.example` 참고.

```bash
PARTNER_ORG_SOURCE=mock   # 또는 mssql
```

## 로컬 검증 (IP 없이)
```bash
cd packages/server
# 스키마 반영
npx prisma migrate deploy   # 또는 db push
npx prisma generate

# .env 에 PARTNER_ORG_SOURCE=mock
npm run partner:org:sync:dry
npm run partner:org:sync
```

관리자 API:
- `GET /org/partner-sync/status`
- `POST /org/partner-sync` body `{ "dryRun": true }`

## 실제 MSSQL
1. 서버 공인 IP를 거래처 방화벽에 등록
2. `.env` 에 `PARTNER_ORG_SOURCE=mssql` + `PARTNER_MSSQL_*` 설정
3. `npm run partner:org:sync`
4. 메신저에 동일 이메일 계정이 있어야 조직도에 사람이 보임
