# EMAX 메신저 배포 가이드

사용자가 **URL로 다운로드 → 설치**할 수 있게 하려면 아래 순서대로 진행하면 됩니다.

---

## 자동 업데이트

- 앱에 **electron-updater**가 적용되어 있습니다.
- **패키징된 앱**(.dmg / .exe로 설치한 버전)은 실행 시 **GitHub Releases**를 확인합니다.
- 새 버전이 있으면 **자동 다운로드** 후, **앱을 종료하면** 다음 실행 시 새 버전이 적용됩니다.
- 사용자는 매번 URL에 접속해 받을 필요 없이, 앱을 켜 두었다가 종료 후 다시 실행하면 최신 버전으로 갱신됩니다.
- 메뉴 **도움말 → 업데이트 확인**으로 수동 확인도 가능합니다.

### GitHub이 404일 때 (비공개 저장소 등)

- 앱이 `https://github.com/emax-project/MESSAGE/releases.atom` 을 조회할 때 **404**가 나면 자동 업데이트가 동작하지 않습니다.
- **비공개(Private) 저장소**는 인증 없이 조회하면 404를 반환합니다. 이 경우 아래 **Generic 서버**를 사용하세요.

**Generic 업데이트 서버 사용 (공개 URL에서 배포)**

1. `packages/client/release/` 안의 **설치 파일**과 **latest.yml**, **latest-mac.yml** 을 **공개 URL**에 올립니다.  
   (예: 본인 서버, S3, GitHub Pages, CDN 등. `latest.yml` / `latest-mac.yml`이 있는 디렉터리 기준으로 URL을 정합니다.)
2. 빌드 시 해당 **베이스 URL**을 지정합니다.

   ```bash
   # 예: https://your-domain.com/emax-releases 에 파일을 올린 경우
   ELECTRON_UPDATER_BASE_URL=https://your-domain.com/emax-releases npm run build:app
   ELECTRON_UPDATER_BASE_URL=https://your-domain.com/emax-releases npm run build:app:win
   ```

3. 이렇게 빌드한 앱은 GitHub 대신 위 URL에서 `latest.yml`(Windows) / `latest-mac.yml`(Mac)을 조회해 자동 업데이트합니다.

- **공개 저장소**를 쓰는 경우에는 위 설정 없이 그대로 GitHub Releases를 사용하면 됩니다.

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

- **Mac에서도 Windows용 .exe 빌드 가능**합니다. (electron-builder가 Wine으로 크로스 빌드)

```bash
# 프로젝트 루트에서 (Windows용만 빌드)
npm run build:app:win
```

- 결과물: `packages/client/release/` 폴더
  - **EMAX Setup 1.0.0.exe** (x64·arm64 둘 다 빌드 시 파일명이 아키텍처별로 나뉠 수 있음)
  - 일반 PC(Intel/AMD) → **x64**용, Windows on ARM(Surface 등) → **arm64**용

- **Windows PC에서 직접 빌드**하려면:
  - 해당 PC에 Node.js 설치 후 `npm run build:app` 또는 `npm run build:app:win` 실행
  - 또는 GitHub Actions에서 `windows-latest` 러너로 빌드 후 아티팩트/릴리스에 첨부

> **한 번에 Mac + Windows 둘 다** 만들려면: Mac에서 `npm run build:app:mac` 실행 후 `npm run build:app:win` 실행하면 .dmg와 .exe를 모두 얻을 수 있습니다.

---

## 2. 사용자에게 다운로드 URL 주는 방법 (GitHub Releases 추천)

### 방법 A: GitHub Releases에 올리기 (가장 간단)

1. **릴리스 페이지**  
   https://github.com/emax-project/MESSAGE/releases

2. **새 릴리스 만들기**
   - **"Create a new release"** 클릭
   - **Tag**: `packages/client/package.json`의 `version`과 맞추기 (예: 버전이 `1.0.1`이면 태그 `v1.0.1`)
   - **Release title**: `v1.0.1` 또는 `EMAX 1.0.1`
   - **Describe**: 변경 사항 요약
   - ⚠️ **자동 업데이트**가 동작하려면, 빌드 전에 `packages/client/package.json`의 `version`을 올리고, 릴리스 태그를 그 버전과 맞춰야 합니다.

3. **빌드한 파일 첨부**
   - "Attach binaries by dropping them here or selecting them" 영역에 **아래 파일을 모두** 첨부해야 합니다.
   - **설치 파일**: `EMAX-1.0.0-arm64.dmg` (Mac), `EMAX-Setup-1.0.0.exe` (Windows)
   - **자동 업데이트용 메타데이터**: `latest.yml`, `latest-mac.yml`  
     → 이 두 파일이 없으면 **도움말 → 업데이트 확인** 및 자동 업데이트가 동작하지 않습니다.
   - 위치: `packages/client/release/` 폴더

4. **"Publish release"** 클릭

5. **다운로드 URL** (릴리스 공개 후 자동 생성)
   - macOS 예:  
     `https://github.com/emax-project/MESSAGE/releases/download/v1.0.0/EMAX-1.0.0-arm64.dmg`
   - Windows 예:  
     `https://github.com/emax-project/MESSAGE/releases/download/v1.0.0/EMAX-Setup-1.0.0.exe`

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
> - **Mac**: [최신 릴리스](https://github.com/emax-project/MESSAGE/releases/latest)에서 `EMAX-xxx.dmg`(또는 arm64.dmg) 다운로드 후, 열어서 앱을 Applications로 드래그하세요.
> - **Windows**: [최신 릴리스](https://github.com/emax-project/MESSAGE/releases/latest)에서 `EMAX Setup xxx.exe`(일반 PC는 x64용) 다운로드 후 실행해 설치하세요.
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
| 2 | Mac에서 `npm run build:app:mac` → .dmg, `npm run build:app:win` → .exe (Windows PC에서만 빌드해도 됨) |
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

## GitHub Actions로 서버 PC Docker 자동 배포 (Self-hosted Runner)

`main` 브랜치에 push 하면 **서버 PC의 Docker**에 자동으로 반영되게 하는 방법입니다.  
**서버 IP를 GitHub에 알려줄 필요가 없습니다.** 서버가 GitHub 쪽으로 나가서 연결하는 방식이라, 방화벽·공인 IP 설정 없이 사용할 수 있습니다.

---

### 이 방식이 어떻게 동작하는지

1. **서버 PC**에 **GitHub Actions Runner** 프로그램을 설치해 둡니다.
2. 이 프로그램이 **서버 → GitHub** 방향으로 연결을 유지합니다. (GitHub가 서버로 접속하는 게 아님)
3. `main`에 push 하면 GitHub이 "이 작업을 실행해라"는 지시만 runner에게 보냅니다.
4. **실제 실행은 서버 PC에서** 일어납니다. (checkout → `docker compose up -d --build`)
5. 그래서 **서버 IP, SSH, 포트 오픈**이 전혀 필요 없습니다.

---

### 1단계: 서버 PC 준비

서버가 될 PC(또는 VM)에서 아래를 준비합니다.

#### 1-1. Docker 설치

```bash
# Ubuntu / Debian 예시
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

(다른 OS는 [Docker 공식 문서](https://docs.docker.com/engine/install/) 참고)

#### 1-2. Docker Compose 사용 가능 확인

```bash
docker compose version
```

`Docker Compose version v2...` 가 나오면 됩니다.

#### 1-3. Docker를 sudo 없이 쓰기 (runner 사용자)

Runner를 실행할 **같은 사용자**가 Docker를 쓸 수 있어야 합니다.

```bash
sudo usermod -aG docker $USER
```

적용하려면 **해당 사용자로 로그아웃했다가 다시 로그인**하거나, 서버를 한 번 재부팅합니다.  
이후 `docker ps` 가 sudo 없이 동작하면 됩니다.

#### 1-4. 인터넷 연결

서버 PC에서 `https://github.com` 으로 **나가는(아웃바운드)** 접속만 되면 됩니다.  
공인 IP가 없어도 되고, GitHub이 서버로 들어오는 인바운드 설정은 필요 없습니다.

---

### 2단계: GitHub에서 Runner 추가 (한 번만)

1. **GitHub**에서 **emax-project/MESSAGE** 저장소로 이동합니다.
2. 상단 **Settings** 탭을 클릭합니다.
3. 왼쪽 메뉴에서 **Actions** → **Runners** 를 클릭합니다.
4. **New self-hosted runner** 버튼을 클릭합니다.
5. **OS**를 선택합니다 (예: **Linux**).
6. 화면에 **Configure** 단계까지 나오면,  
   - **Token**이 한 번 표시됩니다. (복사해 두세요, 나중에 다시 안 나옵니다.)  
   - 그 아래 **Download** / **Configure** / **Run** 명령어가 나옵니다.

여기서 나오는 **정확한 명령어**를 서버 PC에서 그대로 쓰는 것이 가장 좋습니다.  
- **서버가 Linux** → 아래 **A. Linux 서버인 경우**  
- **서버가 Windows** → 아래 **B. Windows 서버인 경우** (Linux용 명령어는 Windows에서 쓰면 안 됩니다.)

---

### 3단계: 서버 PC에서 Runner 설치 및 실행

서버 PC에 **SSH로 접속**하거나 **직접 터미널**을 연 뒤, **서버 OS에 맞는** 아래 중 하나를 실행합니다.

---

#### A. Linux 서버인 경우

**3-1. Runner 다운로드 및 압축 해제 (Linux x64)**

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf actions-runner-linux-x64-2.311.0.tar.gz
```

(다른 아키텍처는 GitHub Runners 화면의 **Download** 명령을 사용하세요.)

**3-2. Runner 설정 (토큰은 GitHub 화면에서 복사한 값으로)**

```bash
./config.sh --url https://github.com/emax-project/MESSAGE --token 여기에_GitHub에서_보여준_토큰_붙여넣기
```

질문이 나오면:

- **Runner name**  
  - 그냥 Enter (기본값) 또는 `server` 입력
- **Labels**  
  - **반드시 `server` 포함**.  
  - 기본 레이블에 더해 `server` 를 추가하거나, 입력할 수 있으면 `self-hosted,Linux,X64,server` 처럼 **server** 가 들어가면 됩니다.
- **Work folder**  
  - 그냥 Enter (기본값)

**3-3. 서비스로 등록 (재부팅 후에도 자동 실행)**

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

실행 중인지 확인: `sudo ./svc.sh status`

---

#### B. Windows 서버인 경우

**3-1. Runner 다운로드**

1. GitHub **Settings** → **Actions** → **Runners** → **New self-hosted runner** 에서 **Windows** 선택.
2. **Download** 항목에 나오는 **actions-runner-win-x64-2.xxx.xxx.zip** 링크를 브라우저로 받거나, PowerShell에서:

```powershell
mkdir $HOME\actions-runner; cd $HOME\actions-runner
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-win-x64-2.311.0.zip -OutFile actions-runner-win-x64-2.311.0.zip
Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD/actions-runner-win-x64-2.311.0.zip", "$PWD")
```

(버전 번호는 [GitHub Runner releases](https://github.com/actions/runner/releases) 에서 최신으로 맞추세요.)

**3-2. Runner 설정**

**PowerShell** 또는 **명령 프롬프트(cmd)** 를 **관리자 권한**으로 연 뒤:

```powershell
cd $HOME\actions-runner
.\config.cmd --url https://github.com/emax-project/MESSAGE --token 여기에_GitHub에서_보여준_토큰_붙여넣기
```

- **Runner name**: Enter 또는 `server`
- **Labels**: **반드시 `server` 포함** (예: `self-hosted,Windows,X64,server`)

**3-3. Runner 실행 (재부팅 후에는 다시 실행 필요)**

```powershell
.\run.cmd
```

이 창을 **열어 두면** runner가 동작합니다. PC를 재부팅한 뒤에는 이 명령을 다시 실행해야 합니다.  
백그라운드 서비스로 등록하려면 [GitHub Runner 문서](https://github.com/actions/runner/blob/main/docs/configure-runner.md)의 Windows 서비스 설치 방법을 참고하세요.

**3-4. GitHub에서 확인**

- 저장소 **Settings** → **Actions** → **Runners** 로 다시 들어갑니다.
- 방금 추가한 runner가 **Idle** (녹색) 상태로 보이면 준비 완료입니다.

---

### 4단계: (선택) JWT_SECRET 등록

이후 배포 시 Docker Compose에 전달할 JWT 비밀값을 등록하려면 아래 **3. JWT_SECRET 등록 방법**을 따르면 됩니다.  
등록하지 않으면 기본값 `change-me-in-production` 이 사용됩니다.

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

### 5단계: 이후 동작 (push 하면)

- **main** 브랜치에 **push** 하면 **Deploy to Server (Docker)** 워크플로우가 자동으로 실행됩니다.
- 실행 위치는 **서버 PC의 runner**입니다. (GitHub 호스트가 아님)
- 워크플로우가 하는 일:
  1. **Checkout**: 최신 코드를 서버 PC의 runner 작업 폴더에 받습니다.
  2. **Docker Compose**: `docker compose up -d --build` 를 실행해 DB·서버 컨테이너를 갱신합니다.
- DB 데이터는 Docker 볼륨(`postgres_data`, `upload_data`)에 남고, **server** 이미지만 최신 코드로 다시 빌드됩니다.  
  (서버 컨테이너 CMD에 `prisma db push`가 있으므로, DB 스키마 변경도 컨테이너 기동 시 자동 반영됩니다.)
- **수동 실행**도 가능합니다: **Actions** 탭 → **Deploy to Server (Docker)** → **Run workflow** → **Run workflow** 버튼 클릭.

**배포 후 웹에서 흰 화면만 나올 때 (개발자 도구 없이 확인)**

1. 브라우저에서 **`http://서버주소:3001/debug-client`** 를 엽니다.
   - `{"ok":true,"clientServed":true,"hasAssets":true}` 이면 클라이언트 파일은 서버에 있습니다.
   - `clientServed: false` 이면 Docker 이미지에 client-dist가 없거나 경로가 잘못된 것입니다. (배포 워크플로·Dockerfile 확인)
2. **`http://서버주소:3001/`** 로 접속했을 때 **"로딩 중..."** 이 잠깐 보였다가 **"페이지를 불러오지 못했습니다..."** 로 바뀌면, HTML은 로드됐지만 JS(asset) 요청이 실패한 것입니다. (리버스 프록시 경로, 방화벽, HTTPS/HTTP 혼용 등 확인)
3. **`/health`** → `{"ok":true}` 이면 API 서버는 동작 중입니다.

---

### 로컬 DB를 서버에 똑같이 반영하기

로컬에서 쓰던 DB 데이터를 서버 DB에 그대로 넣고 싶을 때 아래 순서대로 하면 됩니다.

**1. 로컬에서 DB 덤프**

- 로컬에서 Docker로 DB를 띄운 상태에서, **프로젝트 루트**에서 실행:

```bash
chmod +x scripts/dump-db.sh
./scripts/dump-db.sh
```

- `scripts/dump_YYYYMMDD_HHMM.sql` 파일이 생성됩니다.
- **로컬 DB가 이 프로젝트 Docker가 아닐 때**(다른 Postgres 주소를 쓰는 경우):  
  `packages/server/.env`의 `DATABASE_URL`을 쓰려면  
  `pg_dump "$DATABASE_URL" --no-owner --clean --if-exists -F p -f scripts/dump_수동.sql`  
  처럼 직접 덤프한 뒤, 아래 2단계부터 동일하게 진행하면 됩니다.

**2. 덤프 파일을 서버로 복사**

- 서버 IP·계정을 알고 있다고 할 때 예시 (실제 주소는 본인 환경에 맞게):

```bash
scp scripts/dump_*.sql 사용자명@서버IP:/tmp/
```

- 또는 USB·다른 방법으로 서버의 `/tmp` 등 접근 가능한 경로에 `dump_*.sql`을 올립니다.

**3. 서버에 SSH 접속 후 복원**

- 서버에서 MESSAGE 프로젝트가 있는 디렉터리로 이동한 뒤 실행합니다.

**Linux / macOS**
```bash
cd /경로/MESSAGE   # runner가 체크아웃한 경로 또는 본인이 클론한 경로
cat /tmp/dump_YYYYMMDD_HHMM.sql | docker compose exec -T db psql -U message -d message
```

**Windows (PowerShell)** — 덤프 파일이 있는 경로로 바꿔서 실행 (Runner 기준 예시)
```powershell
cd C:\actions-runner\_work\MESSAGE\MESSAGE
Get-Content "C:\actions-runner\_work\MESSAGE\MESSAGE\dump_20260209_1156.sql" -Raw | docker compose exec -T db psql -U message -d message
```

- 파일명·경로는 실제 덤프 파일 위치에 맞게 수정합니다.
- 복원이 끝나면 서버 DB가 로컬과 같은 데이터를 갖습니다.

**4. (선택) 업로드 파일까지 맞추고 싶을 때**

- 채팅에 올린 파일들은 `packages/server/uploads/`(로컬), 서버는 Docker 볼륨 `upload_data`에 있습니다.
- 로컬 `packages/server/uploads/` 내용을 서버로 복사한 뒤, 서버에서 해당 파일들을 `upload_data` 볼륨이 마운트된 컨테이너 경로(예: `/app/uploads`)로 넣어 주면 됩니다. (필요 시 `docker compose cp` 또는 볼륨 마운트 경로에 직접 복사)

---

### Ollama AI 채팅 (선택)

**방법 A: Docker Compose로 Ollama 포함 (권장)**

- `docker-compose.yml`에 **Ollama 서비스**가 이미 포함되어 있습니다.
- `docker compose up -d --build` 실행 시 Ollama 컨테이너가 자동으로 기동됩니다.
- 서버는 내부 주소 `http://ollama:11434`로 접속합니다.
- **모델 다운로드**는 최초 한 번 수동으로 실행합니다:

```bash
docker compose exec ollama ollama run llama3.1:8b
```

- CPU 전용입니다. GPU를 쓰려면 `docker-compose.yml`의 ollama 서비스에 `deploy.resources.reservations.devices` 설정을 추가하세요. (NVIDIA: [Docker 공식 문서](https://docs.docker.com/config/containers/resource_constraints/#gpu) 참고)

**방법 B: 외부 Ollama 사용**

- 서버 PC와 Ollama가 **다른 IP**에 있는 경우 (예: 192.168.0.204)
- 프로젝트 루트에 `.env` 파일을 만들고 **# 없이** 다음을 추가하세요:

```env
OLLAMA_BASE_URL=http://192.168.0.204:11434
OLLAMA_MODEL=llama3.1:8b
```

- ⚠️ `# OLLAMA_BASE_URL=...` 처럼 `#`으로 주석 처리하면 적용되지 않습니다.
- 설정 후 `docker compose up -d --build`로 재시작해야 적용됩니다.

---

### 요약 체크리스트

| 순서 | 할 일 |
|------|--------|
| 1 | 서버 PC에 Docker, Docker Compose 설치, 사용자를 `docker` 그룹에 추가 |
| 2 | GitHub: **Settings** → **Actions** → **Runners** → **New self-hosted runner** → OS 선택 후 나오는 **토큰·명령어** 확인 |
| 3 | 서버 PC: Runner 다운로드 → `config.sh` (토큰·URL 입력, Label에 **server** 포함) → `svc.sh install` / `svc.sh start` |
| 4 | GitHub Runners 페이지에서 runner가 **Idle** 인지 확인 |
| 5 | (선택) **Settings** → **Secrets and variables** → **Actions** 에서 **JWT_SECRET** 등록 |
| 6 | 이후 **main에 push** 하면 서버 PC Docker에 자동 배포됨 (서버 IP는 GitHub에 알려줄 필요 없음) |
