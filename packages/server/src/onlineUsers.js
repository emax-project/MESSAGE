/** 사용자별 PC/모바일 소켓 연결 수 */
const online = new Map(); // userId -> { desktop: number, mobile: number }

function normalizeDevice(device) {
  return device === 'mobile' ? 'mobile' : 'desktop';
}

function emptyCounts() {
  return { desktop: 0, mobile: 0 };
}

function getCounts(userId) {
  return online.get(String(userId)) || emptyCounts();
}

function isPresent(counts) {
  return (counts.desktop || 0) > 0 || (counts.mobile || 0) > 0;
}

export function add(userId, device = 'desktop') {
  if (!userId) return;
  const key = String(userId);
  const d = normalizeDevice(device);
  const counts = { ...getCounts(key) };
  counts[d] = (counts[d] || 0) + 1;
  online.set(key, counts);
}

export function remove(userId, device = 'desktop') {
  if (!userId) return;
  const key = String(userId);
  const d = normalizeDevice(device);
  const counts = { ...getCounts(key) };
  counts[d] = Math.max(0, (counts[d] || 0) - 1);
  if (!isPresent(counts)) {
    online.delete(key);
  } else {
    online.set(key, counts);
  }
}

export function has(userId) {
  if (!userId) return false;
  return online.has(String(userId));
}

export function getDevices(userId) {
  const counts = getCounts(userId);
  return {
    desktop: (counts.desktop || 0) > 0,
    mobile: (counts.mobile || 0) > 0,
  };
}

/** @returns {string[]} */
export function getAll() {
  return Array.from(online.keys());
}

/**
 * @returns {Record<string, { desktop: boolean, mobile: boolean }>}
 */
export function getPresenceMap() {
  const map = {};
  for (const [userId, counts] of online) {
    map[userId] = {
      desktop: (counts.desktop || 0) > 0,
      mobile: (counts.mobile || 0) > 0,
    };
  }
  return map;
}
