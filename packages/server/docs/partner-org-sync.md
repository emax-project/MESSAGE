# 거래처 MSSQL 조직도 연동 (feature/partner-mssql-org)

## 개요
- 채팅/로그인은 PostgreSQL 유지
- 조직(회사·부서)과 User의 부서 매핑을 거래처 MSSQL(또는 mock)에서 동기화
- 기본: 메신저 계정 **자동 생성 안 함** (이메일로 매칭된 User만 `departmentId` 갱신)
- `--create-users` / `createMissingUsers: true`: 이메일·이름이 있는 재직자 계정 생성 후 매핑
  - 초기 비밀번호: `PARTNER_DEFAULT_PASSWORD` (기본 `123456`)

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
- `POST /org/partner-sync` body `{ "createMissingUsers": true }`

## 실제 MSSQL
1. 접속 경로
   - **이맥스 등 외부에서 검증**: 공인 IP를 거래처 방화벽에 등록 후 `121.143.3.163:9213` (내부 `192.168.123.211:1433`)
   - **거래처 망에 메신저 배포 시**: 같은 망에서 `192.168.123.211:1433` 직접 사용 (9213 불필요)
   - `9210`은 WEB RDP(GW 서버)이며 MS-SQL·메신저 API 포트가 아님
2. `.env` / Docker `environment` 에 `PARTNER_ORG_SOURCE=mssql` + `PARTNER_MSSQL_*` 설정
3. `npm run partner:org:sync` (부서만 / 기존 계정 매핑)
4. 계정까지 만들려면: `npm run partner:org:sync:users`
5. 로그인: LDAP가 꺼져 있으면 거래처 이메일 + `PARTNER_DEFAULT_PASSWORD`(기본 `123456`).
   LDAP를 켜면(`LDAP_ENABLED=true`) 로컬 초기 비밀번호는 쓰지 않고 Synology `uid`로 인증한다. 자세한 내용은 [`ldap.md`](./ldap.md).

운영 이관(서버 설치·이름 변경·검증): [`docs/partner-network-migration.md`](../../../docs/partner-network-migration.md)

## Docker 배포 메모
- 이미지에 `packages/server/scripts` 포함 (`partner:org:sync` CLI)
- compose에 `PARTNER_*` 전달. 거래처 서버는 `.env.partner.example` → `.env` 후 `./scripts/deploy-partner-server.sh`
