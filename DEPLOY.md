# EMAX 메신저 배포 가이드

사용자가 **URL로 다운로드 → 설치**할 수 있게 하려면 아래 순서대로 진행하면 됩니다.

---

## 자동 업데이트

- 앱에 **electron-updater**가 적용되어 있습니다.
- **패키징된 앱**(.dmg / .exe로 설치한 버전)은 실행 시 **GitHub Releases**를 확인합니다.
- 새 버전이 있으면 **자동 다운로드** 후, **앱을 종료하면** 다음 실행 시 새 버전이 적용됩니다.
- 사용자는 매번 URL에 접속해 받을 필요 없이, 앱을 켜 두었다가 종료 후 다시 실행하면 최신 버전으로 갱신됩니다.
- 메뉴 **도움말 → 업데이트 확인**으로 수동 확인도 가능합니다.

---

## 1. 설치 파일 빌드하기

### macOS용 (.dmg)

- **macOS**에서만 빌드 가능합니다.

```bash
# 프로젝트 루트에서
npm run build:app
```

- 결과물: `packages/client/release/` 폴더
  - **EMAX-1.0.0.dmg** (또는 버전에 따라 EMAX-1.0.0-arm64.dmg 등)

### Windows용 (.exe 설치 파일)

- **Windows**에서만 빌드 가능합니다. (또는 CI에서 Windows 러너 사용)

```bash
# 프로젝트 루트에서
npm run build:app
```

- 결과물: `packages/client/release/` 폴더
  - **EMAX Setup 1.0.0.exe** (NSIS 설치 프로그램)

> 한 PC에서 macOS·Windows 둘 다 만들 수는 없습니다. macOS에서는 .dmg만, Windows에서는 .exe만 생성됩니다. 둘 다 제공하려면 GitHub Actions 등 CI로 각 OS에서 빌드하는 방법을 쓰면 됩니다.

---

## 2. 사용자에게 다운로드 URL 주는 방법 (GitHub Releases 추천)

### 방법 A: GitHub Releases에 올리기 (가장 간단)

1. **릴리스 페이지**  
   https://github.com/emax-project/MESSAGE/releases

2. **새 릴리스 만들기**
   - "Draft a new release" 클릭
   - **Tag**: `packages/client/package.json`의 `version`과 맞추기 (예: 버전이 `1.0.1`이면 태그 `v1.0.1`)
   - **Release title**: `v1.0.1` 또는 `EMAX 1.0.1`
   - **Describe**: 변경 사항 요약
   - ⚠️ **자동 업데이트**가 동작하려면, 빌드 전에 `packages/client/package.json`의 `version`을 올리고, 릴리스 태그를 그 버전과 맞춰야 합니다.

3. **빌드한 파일 첨부**
   - "Attach binaries by dropping them here or selecting them" 영역에
   - macOS: `EMAX-1.0.0.dmg` (또는 arm64.dmg)
   - Windows: `EMAX Setup 1.0.0.exe`
   - 드래그하거나 선택해서 업로드

4. **"Publish release"** 클릭

5. **다운로드 URL** (릴리스 공개 후 자동 생성)
   - macOS 예:  
     `https://github.com/emax-project/MESSAGE/releases/download/v1.0.0/EMAX-1.0.0.dmg`
   - Windows 예:  
     `https://github.com/emax-project/MESSAGE/releases/download/v1.0.0/EMAX%20Setup%201.0.0.exe`

사용자에게는 **릴리스 페이지** 링크를 주면 됩니다.  
→ https://github.com/emax-project/MESSAGE/releases/latest  
(항상 “최신 릴리스”로 연결됩니다.)

---

### 방법 B: 직접 서버/S3에 올리기

- `packages/client/release/` 안의 `.dmg`, `.exe` 파일을
- 본인 서버 또는 S3 등에 업로드한 뒤
- 해당 파일의 **다운로드 URL**을 사용자에게 전달하면 됩니다.

---

## 3. 사용자 안내 문구 예시

> **EMAX 메신저 설치**
>
> - **Mac**: [최신 릴리스](https://github.com/emax-project/MESSAGE/releases/latest)에서 `EMAX-xxx.dmg` 다운로드 후, 열어서 앱을 Applications로 드래그하세요.
> - **Windows**: [최신 릴리스](https://github.com/emax-project/MESSAGE/releases/latest)에서 `EMAX Setup xxx.exe` 다운로드 후 실행해 설치하세요.
>
> 설치 후 앱을 실행하면 로그인 화면이 나옵니다.  
> (서버 주소는 회사에서 안내한 주소를 사용해 주세요.)

---

## 4. 앱이 접속할 서버 주소

- 앱은 **빌드 시점**의 `VITE_API_URL` 값으로 API 주소가 정해집니다.
- `packages/client`에 `.env`를 두고:
  - `VITE_API_URL=https://회사서버주소:3001`
- 이 상태에서 `npm run build:app`으로 빌드하면, 배포한 앱은 해당 서버로 접속합니다.
- 개발 시처럼 값을 안 넣으면 기본값 `http://localhost:3001`을 사용합니다.

---

## 5. 요약

| 단계 | 내용 |
|------|------|
| 1 | `packages/client/package.json` 의 `version` 올리기 (예: 1.0.0 → 1.0.1) |
| 2 | macOS/Windows 각각 해당 OS에서 `npm run build:app` 실행 |
| 3 | `packages/client/release/` 에서 .dmg / .exe 확인 |
| 4 | GitHub Releases에 **같은 버전** 태그로 새 릴리스 만들고 해당 파일 업로드 (예: 태그 `v1.0.1`) |
| 5 | (최초 설치자) 사용자에게 `https://github.com/emax-project/MESSAGE/releases/latest` 링크 전달 |

- **최초 설치**: 사용자가 위 URL에서 설치 파일을 받아 설치합니다.
- **이후 업데이트**: 새 릴리스를 올리면, 이미 설치한 사용자는 앱 실행 시 자동으로 새 버전을 받고, **앱 종료 후 다시 실행**하면 새 버전이 적용됩니다. URL에 다시 접속할 필요 없습니다.

> **참고**: macOS에서 자동 업데이트가 완벽히 동작하려면 앱 서명(code signing)이 필요할 수 있습니다. 서명 없이 배포해도 수동 다운로드·설치는 가능합니다.

---

## 서버에 DB 변경사항 반영하기 (Git으로 올린 뒤)

개발자가 `schema.prisma`를 수정해 Git에 올리면, **코드만** 올라갑니다. 서버의 실제 DB에 반영하려면 **서버 PC에서 한 번 더 실행**해야 합니다.

### 방법 1: `db push` (지금 구조에 맞음)

스키마만 바꾸고 마이그레이션 파일을 쓰지 않는 경우:

```bash
# 서버 PC에서
cd /경로/MESSAGE
git pull origin main
cd packages/server
npm install
npm run db:push
```

→ `schema.prisma` 내용이 그대로 DB에 반영됩니다 (테이블 추가/컬럼 추가 등).

### 방법 2: 마이그레이션 사용 시 (`migrate deploy`)

나중에 `prisma migrate dev`로 마이그레이션 파일을 만들어서 관리하는 경우:

```bash
# 서버 PC에서
cd /경로/MESSAGE
git pull origin main
cd packages/server
npm install
npm run db:migrate:deploy
```

→ `prisma/migrations/` 안의 마이그레이션이 순서대로 DB에 적용됩니다.

**정리**: Git pull만 하면 **코드**만 갱신되고, **DB는 그대로**입니다. 위 둘 중 하나를 실행해야 DB 변경이 서버에 반영됩니다.

---

## GitHub Actions로 서버 PC Docker 자동 배포

`main` 브랜치에 push 하면 **서버 PC의 Docker**에 자동으로 반영되게 하려면, 서버 PC에 **GitHub Actions self-hosted runner**를 설치하면 됩니다.

### 1. 서버 PC 준비

- **Docker**와 **Docker Compose** 설치
- 서버 PC가 GitHub에서 **인터넷 접속** 가능 (아웃바운드만 되면 됨, 공인 IP 불필요)
- Runner를 실행할 사용자가 `docker` 그룹에 있어야 함:  
  `sudo usermod -aG docker $USER` 후 로그아웃/로그인

### 2. Self-hosted Runner 설치 (서버 PC에서 한 번만)

1. **GitHub 저장소** → **Settings** → **Actions** → **Runners** → **New self-hosted runner**
2. OS 선택 (Linux / Windows / macOS) 후 화면에 나오는 **설치 명령**을 서버 PC에서 실행  
   (예: Linux)
   ```bash
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
   ./config.sh --url https://github.com/emax-project/MESSAGE --token <화면에_나오는_토큰>
   ```
3. **Runner 이름** 입력 시 그대로 두거나 `server` 등 입력
4. **Labels**에 **`server`** 를 꼭 추가 (워크플로우가 `runs-on: [self-hosted, server]` 로 이 runner를 사용함)
5. **설치 및 서비스 등록** (Linux 예시)
   ```bash
   ./svc.sh install
   ./svc.sh start
   ```
6. GitHub **Runners** 페이지에서 runner가 **Idle** 상태로 보이면 준비 완료

### 3. JWT_SECRET 등록 방법 (GitHub Actions Secret)

운영 환경에서 로그인 토큰 서명에 쓰는 비밀값입니다. 등록해 두면 배포 시 Docker Compose에 자동으로 전달됩니다.

#### 1) JWT_SECRET 값 만들기

터미널에서 아래 중 하나로 **랜덤 문자열**을 만듭니다.

```bash
# macOS / Linux
openssl rand -base64 32
```

또는  
[https://generate-secret.vercel.app/32](https://generate-secret.vercel.app/32) 같은 사이트에서 32자 이상 랜덤 문자열을 복사해도 됩니다.

→ 이 값을 **어딘가에 메모**해 두고, 아래 2)에서 **Value**에 그대로 붙여넣습니다.

#### 2) GitHub 저장소에 Secret 추가

1. **GitHub**에서 **emax-project/MESSAGE** 저장소 페이지로 이동
2. 상단 메뉴 **Settings** 클릭
3. 왼쪽에서 **Secrets and variables** → **Actions** 클릭
4. **Repository secrets** 영역에서 **New repository secret** 버튼 클릭
5. **Name**에 **`JWT_SECRET`** 입력 (대소문자·밑줄 정확히)
6. **Secret**에 1)에서 만든 랜덤 문자열 붙여넣기
7. **Add secret** 클릭

이후 Deploy 워크플로우가 실행될 때 이 값이 사용됩니다.  
등록하지 않으면 `docker-compose.yml`의 기본값(`change-me-in-production`)이 쓰이므로, **운영 환경에서는 반드시 등록하는 것을 권장**합니다.

### 4. 동작 방식

- **main** 브랜치에 **push** 하면 워크플로우가 실행됩니다.
- 또는 **Actions** 탭 → **Deploy to Server (Docker)** → **Run workflow** 로 수동 실행 가능합니다.
- 워크플로우가 **서버 PC의 runner**에서 실행되며, **checkout** → **docker compose up -d --build** 를 실행합니다.
- DB는 Docker 볼륨으로 유지되고, **server** 이미지는 매번 최신 코드로 다시 빌드됩니다.  
  (서버 컨테이너 CMD에 `prisma db push`가 있으므로, 스키마 변경도 컨테이너 기동 시 자동 반영됩니다.)

### 5. 정리

| 단계 | 내용 |
|------|------|
| 1 | 서버 PC에 Docker, Docker Compose 설치 및 runner 사용자를 `docker` 그룹에 추가 |
| 2 | GitHub에서 self-hosted runner 추가, Labels에 **server** 포함 |
| 3 | (선택) `JWT_SECRET` 저장소 Secret 등록 |
| 4 | 이후 **main에 push** 하면 서버 PC Docker에 자동 배포됨 |
