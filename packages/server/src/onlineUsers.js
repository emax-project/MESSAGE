/** 현재 로그인(연결) 중인 사용자 ID 집합 */
const online = new Set();

export function add(userId) {
  if (userId) online.add(String(userId));
}

export function remove(userId) {
  if (userId) online.delete(String(userId));
}

export function has(userId) {
  return userId ? online.has(String(userId)) : false;
}

export function getAll() {
  return Array.from(online).map((id) => String(id));
}
