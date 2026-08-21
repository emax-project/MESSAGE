/** 클라이언트가 보고하는 접속 기기 종류 */
export type ClientDevice = 'desktop' | 'mobile';

export type UserDevicePresence = {
  desktop: boolean;
  mobile: boolean;
};

export type OnlinePresenceMap = Record<string, UserDevicePresence>;

export function detectClientDevice(): ClientDevice {
  if (typeof window === 'undefined') return 'desktop';
  if (window.electronAPI) return 'desktop';
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function presenceFromList(
  userIds: string[] | undefined,
  presence?: OnlinePresenceMap | null,
): OnlinePresenceMap {
  const map: OnlinePresenceMap = {};
  if (presence && typeof presence === 'object') {
    for (const [id, devices] of Object.entries(presence)) {
      map[String(id)] = {
        desktop: !!devices?.desktop,
        mobile: !!devices?.mobile,
      };
    }
  }
  for (const id of userIds ?? []) {
    const key = String(id);
    if (!map[key]) {
      // 구버전 서버 호환: 디바이스 정보 없으면 PC 온라인으로 간주
      map[key] = { desktop: true, mobile: false };
    }
  }
  return map;
}

export function mergePresence(
  prev: OnlinePresenceMap,
  userId: string,
  devices?: UserDevicePresence | null,
  fallbackDevice?: ClientDevice,
): OnlinePresenceMap {
  const key = String(userId);
  const next = { ...prev };
  if (devices) {
    next[key] = { desktop: !!devices.desktop, mobile: !!devices.mobile };
    if (!next[key].desktop && !next[key].mobile) delete next[key];
  } else if (fallbackDevice) {
    const cur = next[key] ?? { desktop: false, mobile: false };
    next[key] = {
      desktop: fallbackDevice === 'desktop' ? true : cur.desktop,
      mobile: fallbackDevice === 'mobile' ? true : cur.mobile,
    };
  }
  return next;
}

export function removePresence(prev: OnlinePresenceMap, userId: string): OnlinePresenceMap {
  const key = String(userId);
  if (!(key in prev)) return prev;
  const next = { ...prev };
  delete next[key];
  return next;
}

export function isUserOnline(presence: OnlinePresenceMap, userId: string): boolean {
  const d = presence[String(userId)];
  return !!(d?.desktop || d?.mobile);
}

export function onlineIdsFromPresence(presence: OnlinePresenceMap): Set<string> {
  return new Set(
    Object.entries(presence)
      .filter(([, d]) => d.desktop || d.mobile)
      .map(([id]) => id),
  );
}
