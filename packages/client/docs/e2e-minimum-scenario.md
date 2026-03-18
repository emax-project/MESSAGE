# E2E 최소 시나리오 (핵심 플로우 1개)

## 목표
- 릴리즈 전에 "사용자가 실제로 가장 많이 쓰는 핵심 경로"가 깨지지 않았는지 빠르게 확인한다.
- 테스트 1개만으로도 회귀 위험이 큰 영역을 방어한다.

## 시나리오 이름
- **채팅방 진입 후 메시지 전송 성공**

## 범위
- 로그인 성공 이후 메인 화면 진입
- 좌측 방 목록에서 채팅방 선택
- 채팅창 입력 후 전송
- 전송 메시지가 리스트에 노출되는지 확인

## 사전 조건
- 테스트 계정 1개 이상 준비
- 메시지를 보낼 수 있는 room이 fixture로 존재
- 테스트 환경에서 API/소켓이 안정적으로 응답

## 단계
1. 앱을 연다.
2. 로그인 페이지에서 아이디/비밀번호를 입력하고 로그인한다.
3. 메인 화면이 보이면 좌측 채팅방 목록에서 `QA 테스트 방`을 클릭한다.
4. 채팅 입력창에 `E2E smoke message`를 입력한다.
5. 전송 버튼을 누른다(또는 Enter).
6. 방금 보낸 메시지가 채팅 버블 리스트에 보이는지 확인한다.

## 검증 포인트
- 메인 화면이 정상 표시된다.
- 채팅방 진입 후 채팅창이 렌더된다.
- 전송 액션 이후 메시지가 화면에 보인다.
- 새로고침(선택) 후에도 메시지가 조회된다.

## 실패 시 분류 기준
- 로그인 실패: 인증/세션 문제
- 방 목록 렌더 실패: 메인 쿼리/소켓 초기화 문제
- 전송 후 미노출: 전송 API/소켓 이벤트/메시지 리스트 동기화 문제

## Playwright 예시 골격
```ts
test('user can open room and send message', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('이메일').fill('qa@emax.com');
  await page.getByLabel('비밀번호').fill('password');
  await page.getByRole('button', { name: '로그인' }).click();

  await page.getByText('QA 테스트 방').click();
  await page.getByPlaceholder('메시지 입력').fill('E2E smoke message');
  await page.getByRole('button', { name: '전송' }).click();

  await expect(page.getByText('E2E smoke message')).toBeVisible();
});
```

## 운영 팁
- 이 시나리오는 PR마다 smoke로 돌리고, 실패 시 배포를 막는다.
- 데이터 의존성을 줄이기 위해 테스트용 room/계정을 고정 fixture로 유지한다.

## 실제 실행 방법 (Playwright)
```bash
cd packages/client

# 1) 브라우저 설치 (최초 1회)
npx playwright install chromium

# 2) 환경변수 설정
export E2E_EMAIL="qa@emax.com"
export E2E_PASSWORD="password"
export E2E_ROOM_NAME="QA 테스트 방"

# 선택: 외부 실행 중인 서버를 쓸 때
# export E2E_SKIP_WEB_SERVER=1
# export E2E_BASE_URL="http://127.0.0.1:5173"

# 3) 실행
npm run e2e
```
