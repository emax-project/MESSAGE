# 사용자/DB 증가 시 성능 고려 사항

사용자 수나 DB 데이터가 많아질 때 느려질 수 있는 부분과 개선 방향을 정리했습니다.

---

## 1. 백엔드 (서버)

### 1-1. 채팅방 목록 (GET /rooms) — N+1 쿼리

**위치:** `packages/server/src/routes/rooms.js` (roomsRouter.get('/'))

**문제:**
- 방 목록을 가져온 뒤, **방마다** `unreadMessages`를 따로 `findMany`로 조회합니다.
- 방이 50개면 쿼리 1 + 50 = 51번 발생 (N+1).

**개선:**
- 한 번에 `message` 개수만 세는 방식으로 변경 (예: `_count` 사용).
- 또는 `lastReadAt` 기준으로 읽지 않은 메시지 수를 한 번의 집계 쿼리로 계산.

---

### 1-2. 사용자 목록 (GET /users) — 전체 조회, 제한 없음

**위치:** `packages/server/src/routes/users.js` (usersRouter.get('/'))

**문제:**
- `prisma.user.findMany()`에 **limit 없이** 전체 사용자를 반환합니다.
- 사용자 1만 명이면 응답 크기·DB 부하 모두 커짐.

**개선:**
- 페이지네이션: `take`/`skip` 또는 cursor 기반.
- 검색/필터: 이름·부서 등 조건으로 `where` 추가 후 `take`로 상한 두기.

---

### 1-3. 조직도 트리 (GET /org/tree) — 전체 로드

**위치:** `packages/server/src/routes/org.js` (orgRouter.get('/tree'))

**문제:**
- 회사·부서·사용자를 **한 번에 전부** 가져옵니다.
- 회사/부서/사용자 수가 크면 메모리·응답 시간 모두 증가.

**개선:**
- 트리 단계별 로딩: 최상위만 먼저, 부서/사용자는 펼칠 때 요청.
- 또는 회사/부서별 페이지네이션 + 필요 시 사용자 목록도 제한.

---

### 1-4. 일정 목록 (GET /events) — 제한 없음

**위치:** `packages/server/src/routes/events.js` (eventsRouter.get('/'))

**문제:**
- `prisma.event.findMany()`에 **take 없이** 해당 사용자 일정 전체 조회.
- 일정이 많을수록 쿼리·응답이 무거워짐.

**개선:**
- 기간 필터: `startAt`/`endAt`으로 `where` 지정.
- 페이지네이션 또는 “최근 N개 + 기간별 요청” 방식.

---

### 1-5. 소켓 — 멘션 시 전체 소켓 순회

**위치:** `packages/server/src/socket.js` (message 핸들러 내 멘션 알림)

**문제:**
- 멘션 알림을 보낼 때 `io.fetchSockets()`로 **연결된 소켓 전체**를 가져온 뒤, `userId`가 같은 소켓만 골라서 `emit`합니다.
- 동시 접속자가 많을수록 `fetchSockets()`와 루프 비용이 커짐.

**개선:**
- `userId`별로 소켓을 그룹 짓는 맵(또는 Room)을 두고, 해당 유저 소켓만 골라서 `emit`.
- 또는 Socket.IO의 `io.in(userRoomId).emit(...)`처럼 “유저별 룸”을 사용해 전체 소켓을 매번 가져오지 않기.

---

### 1-6. 프로젝트/칸반 (GET /projects/room/:roomId) — 제한 없음

**위치:** `packages/server/src/routes/projects.js`

**문제:**
- 한 방의 **모든 프로젝트**를 `findMany`로 가져오고, 각 프로젝트에 **모든 보드·태스크**를 include합니다.
- 프로젝트/태스크 수가 많으면 한 번에 로드되는 데이터가 매우 커짐.

**개선:**
- 프로젝트 목록은 페이지네이션 또는 상한(예: `take: 50`).
- 태스크는 보드별·상태별로 나누어 요청하거나, 필요 시 별도 API로 페이지네이션.

---

## 2. 프론트엔드 (클라이언트)

### 2-1. 채팅 메시지 — 위로 더 불러오기 없음

**위치:** `packages/client/src/pages/ChatWindow.tsx`, `api.ts`

**현재:**
- `roomsApi.messages(roomId)`를 **cursor 없이** 한 번만 호출 → 최신 50개만 로드.
- 서버는 `nextCursor`/`hasMore`를 지원하지만, 클라이언트에서 **이전 페이지(cursor) 요청**을 하지 않음.

**영향:**
- 데이터가 많아져도 “한 방당 50개”로 제한되어 있어 **서버/DB 부하는 제한적**입니다.
- 다만 **UX**: 오래된 메시지를 보려면 “위로 스크롤 시 이전 메시지 로드”가 없어 불편할 수 있습니다.

**개선:**
- 스크롤이 맨 위에 가까워지면 `nextCursor`로 이전 메시지를 요청해 기존 목록 앞에 붙이기 (무한 스크롤).

---

### 2-2. 채팅방 목록 / 친구(조직도) — 한 번에 전부 렌더

**위치:** `packages/client/src/pages/Main.tsx`

**문제:**
- 방 목록·조직 트리를 **전부** 한 번에 DOM으로 렌더링합니다.
- 방/사용자 수가 매우 많으면 DOM 노드 수가 늘어나 스크롤·탭 전환 등이 무거워질 수 있습니다.

**개선:**
- 가상 스크롤(react-window, react-virtuoso 등): 보이는 구간만 렌더링.
- 또는 “접기/펼치기”로 트리 깊이를 제한하고, 펼친 노드만 로드/렌더.

---

### 2-3. 채팅 메시지 목록 — 긴 방일 때 DOM 개수

**위치:** `packages/client/src/pages/ChatWindow.tsx`

**현재:**
- 한 번에 50개만 오므로 당장은 큰 문제는 아닐 수 있음.
- “위로 더 불러오기”를 구현하면 50+50+… 으로 수백 개가 쌓일 수 있음.

**개선:**
- 위로 스크롤 로딩을 넣을 경우, **역방향 가상 스크롤** 또는 “윈도우” 밖 메시지는 DOM에서 제거/재사용하는 방식 고려.

---

## 3. DB 인덱스 (현재 상태)

**위치:** `packages/server/prisma/schema.prisma`

- `Message`: `roomId`, `senderId`, `(roomId, createdAt)`, `fileExpiresAt` 인덱스 있음 → 메시지 조회/페이징에 유리.
- `RoomMember`: `userId`, `roomId` 인덱스 있음.
- `User`: `departmentId` 인덱스 있음.

데이터가 많아지면 다음도 점검하는 것이 좋습니다.

- `Event`: `userId`, `startAt` 외에 **조회 조건에 맞는 복합 인덱스** (예: 기간 검색).
- `ReadReceipt`, `Reaction` 등 메시지별 조회가 잦으면 `messageId` 인덱스 유지.

---

## 4. 요약 표

| 구분 | 위치 | 문제 요약 | 우선순위 |
|------|------|-----------|----------|
| 서버 | GET /rooms | 방마다 unread 쿼리 (N+1) | 높음 |
| 서버 | GET /users | 전체 사용자 무제한 | 높음 |
| 서버 | GET /org/tree | 조직 전체 한 번에 로드 | 중간 |
| 서버 | GET /events | 일정 전체, 기간 제한 없음 | 중간 |
| 서버 | socket (멘션) | fetchSockets() 전체 순회 | 중간 |
| 서버 | GET projects/room/:roomId | 프로젝트/태스크 전부 로드 | 중간 |
| 클라이언트 | 채팅 | 위로 스크롤 시 이전 메시지 미로드 | UX |
| 클라이언트 | Main | 방/조직 목록 전부 렌더 | 데이터 많을 때 |

---

**정리:**  
사용자/DB가 늘어나면 **GET /rooms**(N+1), **GET /users**(전체 조회), **GET /org/tree**(전체 트리), **소켓 멘션**(전체 소켓 순회)부터 점검·개선하는 것을 권장합니다. 메시지 목록은 이미 cursor 기반으로 50개 제한이 있어 상대적으로 덜 치명적이지만, “이전 메시지 더 보기”를 넣을 때는 위와 같이 클라이언트/서버 모두 고려하는 것이 좋습니다.
