/** 현재 로그인(연결) 중인 사용자 ID별 소켓 연결 수 */
const online = new Map();

export function add(userId) {
  if (!userId) return;
  const key = String(userId);
  online.set(key, (online.get(key) || 0) + 1);
}

export function remove(userId) {
  if (!userId) return;
  const key = String(userId);
  const count = online.get(key) || 0;
  if (count <= 1) {
    online.delete(key);
  } else {
    online.set(key, count - 1);
  }
}

export function has(userId) {
  return userId ? online.has(String(userId)) : false;
}

export function getAll() {
  return Array.from(online.keys());
}
