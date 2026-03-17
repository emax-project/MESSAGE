import { prisma } from './db.js';

/**
 * Expo Push API를 사용하여 푸시 알림을 보냅니다.
 * FCM/APNs 키 설정 없이 Expo 푸시 서비스를 통해 전송합니다.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** 같은 방 연속 메시지 → 하나의 알림으로 묶음 (짧게 해서 알림이 빨리 오도록) */
const PUSH_DEBOUNCE_MS = 600;
const pendingByRoom = new Map();

/**
 * 특정 유저에게 푸시 알림을 보냅니다.
 * @param {string} userId - 수신자 ID
 * @param {{ title: string, body: string, data?: object }} notification
 */
export async function sendPushToUser(userId, notification) {
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.warn('[push] Expo push failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[push] sendPushToUser error:', err.message);
  }
}

/**
 * 방의 모든 멤버에게 푸시를 보냅니다.
 * 단, excludeUserIds에 포함된 유저(보낸 사람, 현재 보고 있는 유저)는 제외합니다.
 * @param {string} roomId
 * @param {string[]} excludeUserIds
 * @param {{ title: string, body: string, data?: object }} notification
 */
export function sendPushToRoom(roomId, excludeUserIds, notification) {
  const key = roomId;
  const existing = pendingByRoom.get(key);
  if (existing) clearTimeout(existing.timer);
  const count = existing ? existing.count + 1 : 1;
  const timer = setTimeout(async () => {
    const cur = pendingByRoom.get(key);
    pendingByRoom.delete(key);
    if (cur) {
      try {
        const notif = cur.count > 1
          ? { ...cur.notification, body: `${cur.count}개의 새 메시지` }
          : cur.notification;
        await doSendPushToRoom(roomId, cur.excludeUserIds, notif);
      } catch (e) {
        console.warn('[push] doSendPushToRoom error:', e?.message);
      }
    }
  }, PUSH_DEBOUNCE_MS);
  pendingByRoom.set(key, { timer, excludeUserIds, notification, count });
}

async function doSendPushToRoom(roomId, excludeUserIds, notification) {
  try {
    const members = await prisma.roomMember.findMany({
      where: { roomId, leftAt: null },
      select: { userId: true },
    });
    const targetIds = members
      .map((m) => m.userId)
      .filter((id) => !excludeUserIds.includes(id));

    if (targetIds.length === 0) return;

    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: targetIds } },
      select: { token: true, userId: true },
    });
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
    }));

    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchTokens = tokens.slice(i, i + batchSize);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('[push] Expo push batch failed:', res.status, JSON.stringify(json));
        continue;
      }
      // DeviceNotRegistered 등 무효 토큰 제거 (앱 삭제, 권한 취소 등)
      const tickets = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          const t = batchTokens[j];
          if (t) {
            await prisma.deviceToken.deleteMany({
              where: { userId: t.userId, token: t.token },
            }).catch(() => {});
            console.log('[push] Removed invalid token for user', t.userId);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[push] sendPushToRoom error:', err.message);
  }
}
