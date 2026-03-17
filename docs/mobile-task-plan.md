# EMAX 모바일 앱 작업 계획 (Task Plan)

React Native(Expo) 기반 Android·iOS 앱 개발을 위한 단계별 작업 목록.

---

## Phase 0: 환경 준비

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 0.1 | Expo 프로젝트 생성 | `packages/mobile` 디렉터리에 `npx create-expo-app` | 0.5d |
| 0.2 | 모노레포 연동 | 루트 `package.json` workspaces에 `packages/mobile` 추가 | 0.5d |
| 0.3 | shared 패키지 (선택) | API 타입, 엔드포인트 상수 분리 | 1d |
| 0.4 | 의존성 설치 | `socket.io-client`, `zustand`, `@tanstack/react-query`, `expo-secure-store`, `expo-local-authentication` 등 | 0.5d |

---

## Phase 1: 인증·로그인

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 1.1 | API 클라이언트 | `getBaseUrl`, `authApi`, fetch 기반 HTTP | 1d |
| 1.2 | LoginScreen UI | 서버 주소, 이메일, 비밀번호 입력 폼 | 1d |
| 1.3 | HTTPS 검증 | `http://` 입력 시 차단 또는 자동 치환 | 0.5d |
| 1.4 | 로그인 정보 자동 저장 | `AsyncStorage`: `emax_last_server_url`, `emax_last_email` | 0.5d |
| 1.5 | RegisterScreen | 회원가입 화면 | 1d |
| 1.6 | 자동 로그인 (생체/PIN) | `expo-secure-store` + `expo-local-authentication` | 1.5d |
| 1.7 | AuthStore (Zustand) | token, user, persist with AsyncStorage | 0.5d |
| 1.8 | 네비게이션 분기 | 토큰 유무에 따라 Login ↔ Main | 0.5d |

---

## Phase 2: 메인·채팅

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 2.1 | 하단 탭 네비게이션 | [채팅] [프로젝트] [더보기] | 0.5d |
| 2.2 | RoomListScreen | 토픽/채팅 탭, 폴더 접기, 검색 | 2d |
| 2.3 | roomsApi 연동 | `roomsApi.list`, `foldersApi.list` | 0.5d |
| 2.4 | Socket.io 연결 | `getSocketUrl`, `join_room`, `message` 이벤트 | 1d |
| 2.5 | ChatScreen | FlatList 메시지, 날짜 구분선 | 2d |
| 2.6 | 메시지 전송 | 입력창, 파일 첨부, `filesApi.upload` | 1.5d |
| 2.7 | FileMessage | 이미지 미리보기, 파일 다운로드 | 1d |
| 2.8 | 읽음 처리 | `room_read` 소켓 이벤트 | 0.5d |

---

## Phase 3: 푸시·알림

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 3.1 | FCM 설정 (Android) | Firebase 프로젝트, `google-services.json` | 1d |
| 3.2 | APNs 설정 (iOS) | Apple Developer, 키/인증서 | 1d |
| 3.3 | expo-notifications | 토큰 등록, 푸시 수신 | 1d |
| 3.4 | 서버: 디바이스 토큰 저장 | `POST /users/me/device-token` | 1d |
| 3.5 | 서버: 푸시 발송 로직 | 메시지 도착 시 FCM/APNs 호출 | 1.5d |
| 3.6 | viewing_room (멀티 디바이스) | 소켓 이벤트, 서버 저장, 푸시 생략 조건 | 1.5d |

---

## Phase 4: 프로젝트·부가 화면

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 4.1 | KanbanScreen | 칸반 보드, 가로 스크롤, 터치 | 2d |
| 4.2 | GanttScreen | 간트 차트, 터치·줌 | 2d |
| 4.3 | MentionScreen | 멘션 목록 | 1d |
| 4.4 | BookmarkScreen | 북마크 목록 | 1d |
| 4.5 | ScheduleScreen | 일정 캘린더 | 1.5d |
| 4.6 | AIChatScreen | Ollama 연동 (선택) | 1d |
| 4.7 | SettingsScreen | 테마, 알림, 자동 로그인 on/off | 1d |
| 4.8 | OrgTreeScreen | 조직도, 접이식 트리 | 1.5d |

---

## Phase 5: 권한·iOS 대응

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 5.1 | 권한 설정 | Info.plist, AndroidManifest | 0.5d |
| 5.2 | 사진/카메라 권한 | 아바타, 파일 첨부 시점 요청 | 0.5d |
| 5.3 | HTTPS 강제 | 서버 주소 입력 시 https 검증 | 0.5d |
| 5.4 | 심사용 데모 계정 | App Review 노트 작성 | 0.5d |

---

## Phase 6: 마무리

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 6.1 | 다크 모드 | ThemeStore, 스타일 적용 | 1d |
| 6.2 | 에러 핸들링 | 네트워크 오류, 401 로그아웃 | 0.5d |
| 6.3 | E2E 테스트 (선택) | Detox 또는 Maestro | 1d |
| 6.4 | 스토어 제출 준비 | 스크린샷, 설명, 개인정보 처리방침 | 1d |

---

## 예상 일정 요약

| Phase | 내용 | 예상 기간 |
|-------|------|------------|
| 0 | 환경 준비 | 2~3일 |
| 1 | 인증·로그인 | 6~7일 |
| 2 | 메인·채팅 | 10~11일 |
| 3 | 푸시·알림 | 7~8일 |
| 4 | 프로젝트·부가 화면 | 11~12일 |
| 5 | 권한·iOS 대응 | 2일 |
| 6 | 마무리 | 3~4일 |

**총 예상: 약 6~8주** (1인 기준)

---

## 의존성 순서

```
Phase 0 → Phase 1 → Phase 2
              ↓         ↓
           Phase 3 (푸시는 2와 병렬 가능)
              ↓
           Phase 4 (2 완료 후)
              ↓
           Phase 5, 6
```
