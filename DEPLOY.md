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
