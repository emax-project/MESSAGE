# 04_MESSAGE — 데스크톱 메신저

Electron + Node.js 기반 회사용 메신저 (맥/윈도우).

## 구성 요소

| 용도 | 설명 |
|------|------|
| **DB (PostgreSQL)** | 사용자, 채팅방, 메시지 저장. 채팅 목록("목록을 불러올 수 없습니다" 오류는 DB 없으면 발생) |
| **API 서버** | 로그인, 채팅, AI 프록시 등 처리 |
| **Ollama** | AI 채팅 (다른 PC에 설치 가능, 같은 WiFi면 `192.168.0.204:11434` 등) |

## Docker로 DB + 서버 실행

```bash
# 프로젝트 루트에서
docker compose up -d

# DB만 쓰고 서버는 로컬에서 실행할 때
docker compose up -d db
cd packages/server && cp .env.example .env && npm run dev
```

- **PostgreSQL**: `localhost:5433` (호스트 포트), 사용자 `message`, 비밀번호 `message`, DB `message`
- **서버**: `http://localhost:3001`
- `JWT_SECRET` 변경이 필요하면 `.env`에 설정 후 `docker compose up` 시 적용 (또는 `docker compose` 전에 `export JWT_SECRET=...`)

## 메신저 앱 실행 방법

1. **백엔드 켜기**  
   - Docker 사용: `docker compose up -d`  
   - 또는 DB만 Docker: `docker compose up -d db` 후 `packages/server`에 `.env` 두고 `npm run dev:server`

2. **데스크톱 앱 실행**  
   - 프로젝트 루트에서: `npm run dev:app`  
   - (Vite 개발 서버 + Electron 창이 뜹니다. 로그인/회원가입 후 채팅 사용)

- **맥에서 알림이 안 보일 때**: 시스템 설정 → 알림 → **Electron**(개발 시) 또는 **04 Message**(빌드 앱) → **알림 허용** 켜기. 앱에서 **알림 테스트** 버튼으로 동작 여부 확인 가능.
- 앱은 기본적으로 `http://localhost:3001` API에 연결합니다. 서버 주소를 바꾸려면 `packages/client`에 `.env` 만들고 `VITE_API_URL=http://다른주소:3001` 로 설정한 뒤 앱을 다시 실행하세요.

## 로컬 개발 (DB만 Docker)

1. `docker compose up -d db`
2. `packages/server`에 `.env` 생성 후 `DATABASE_URL=postgresql://message:message@localhost:5433/message` 등 설정
3. `npm run db:push --workspace=server` 또는 `npm run db:migrate --workspace=server`
4. `npm run dev:server` (서버), `npm run dev:app` (Electron 앱)

## 혼자서 채팅 테스트하기

1. 백엔드 + 앱 실행 후, **테스트 계정**을 DB에 넣습니다:
   ```bash
   cd packages/server
   echo 'DATABASE_URL="postgresql://message:message@localhost:5433/message"' > .env
   npm run db:seed
   ```
   → `test1@test.com` / `123456`, `test2@test.com` / `123456` 두 명 생성됨.

2. 앱에서 **테스트1**로 로그인 (`test1@test.com` / `123456`).

3. 채팅 목록 위 **「테스트: 새 창 열기」** 버튼을 누르거나, 상단 메뉴 **테스트 → 새 창 열기**를 선택.

4. 새로 뜬 창에서 **테스트2**로 로그인 (`test2@test.com` / `123456`).

5. 첫 번째 창에서 **+ 새 채팅** → **테스트2** 선택 후 메시지 보내면, 두 번째 창에서 실시간으로 확인 가능.

## 사용자 배포 (설치 파일 + URL로 다운로드)

- **빌드**: 프로젝트 루트에서 `npm run build:app` → `packages/client/release/` 에 .dmg(mac) / .exe(win) 생성
- **다운로드 URL 제공**: [DEPLOY.md](./DEPLOY.md) 참고 — GitHub Releases에 올리면 사용자가 `https://github.com/emax-project/MESSAGE/releases/latest` 에서 받을 수 있음
