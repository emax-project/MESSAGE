import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { filesApi, getBaseUrl, getSocketUrl, navigateToLogin, type Message, type Room } from '../../../api';

type MessagesPage = { messages: Message[]; nextCursor: string | null; hasMore: boolean };

type UseMainSocketParams = {
  token: string | null;
  queryClient: QueryClient;
  myIdRef: MutableRefObject<string | undefined>;
  recentTopicRoomRef: MutableRefObject<{ id: string; at: number } | null>;
  mutedRoomIdsRef: MutableRefObject<Set<string>>;
  notificationsSnoozedUntilRef: MutableRefObject<number>;
  setOnlineUserIds: Dispatch<SetStateAction<Set<string>>>;
  setSocketConnected: Dispatch<SetStateAction<boolean>>;
  setSocket: Dispatch<SetStateAction<Socket | null>>;
  socketRef: MutableRefObject<Socket | null>;
  allRooms: Room[];
  socket: Socket | null;
  socketConnected: boolean;
};

export function useMainSocket({
  token,
  queryClient,
  myIdRef,
  recentTopicRoomRef,
  mutedRoomIdsRef,
  notificationsSnoozedUntilRef,
  setOnlineUserIds,
  setSocketConnected,
  setSocket,
  socketRef,
  allRooms,
  socket,
  socketConnected,
}: UseMainSocketParams) {
  useEffect(() => {
    if (!token) return;
    if (socketRef.current?.connected) return;
    const url = getSocketUrl();
    const s = io(url, { path: '/socket.io', auth: { token } });
    socketRef.current = s;
    s.on('connect_error', (err: { message?: string }) => {
      if (err?.message?.includes('invalid token')) {
        try {
          localStorage.setItem('forcedLogoutMessage', '다른 기기에서 로그인되어 로그아웃되었습니다.');
          localStorage.removeItem('token');
          if (typeof window !== 'undefined') navigateToLogin();
        } catch {
          // ignore
        }
      }
    });
    s.on('connect', () => {
      setSocketConnected(true);
      if (myIdRef.current) setOnlineUserIds((prev) => new Set([...prev, String(myIdRef.current)]));
    });
    s.on('disconnect', () => {
      setSocketConnected(false);
    });
    s.on('message', (msg: Message) => {
      const withReadCount = { ...msg, readCount: msg.readCount ?? 0 };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(['rooms', msg.roomId, 'messages'], (old) => {
        if (!old?.pages?.length) return { pages: [{ messages: [withReadCount], nextCursor: null, hasMore: false }], pageParams: [undefined] };
        const firstPage = old.pages[0];
        if (firstPage?.messages?.some((m) => m.id === msg.id)) return old;
        const updatedFirst = { ...firstPage, messages: [withReadCount, ...(firstPage.messages ?? [])] };
        return { ...old, pages: [updatedFirst, ...old.pages.slice(1, 5)] };
      });
      (async () => {
        const myId = myIdRef.current;
        if (!myId) return;
        await queryClient.refetchQueries({ queryKey: ['rooms', myId] });
        const rooms = queryClient.getQueryData<Room[]>(['rooms', myId]) ?? [];
        const recent = recentTopicRoomRef.current;
        const fixed =
          recent && recent.id === msg.roomId && Date.now() - recent.at < 5000
            ? rooms.map((r) => (r.id === recent.id ? { ...r, isTopic: true, isGroup: true } : r))
            : rooms;
        if (fixed !== rooms) queryClient.setQueryData(['rooms', myId], fixed);
        if (recent?.id === msg.roomId) recentTopicRoomRef.current = null;
      })();
      if (msg.senderId !== myIdRef.current) {
        if (notificationsSnoozedUntilRef.current > Date.now()) return;
        if (mutedRoomIdsRef.current.has(String(msg.roomId))) return;
        try {
          const activeRoomId = localStorage.getItem('activeChatRoomId');
          const activeFocused = localStorage.getItem('activeChatFocused');
          if (activeFocused != null && activeFocused !== '0' && activeFocused !== '1') {
            localStorage.removeItem('activeChatFocused');
            localStorage.removeItem('activeChatRoomId');
          } else if (activeRoomId === msg.roomId && activeFocused === '1') return;
        } catch {
          // ignore
        }
        const senderName = msg.sender?.name ?? '알 수 없음';
        const rooms = queryClient.getQueryData<Room[]>(['rooms', myIdRef.current]) ?? [];
        const room = rooms.find((r) => r.id === msg.roomId);
        const isTopic = !!room?.isTopic;
        const roomName = room?.name ?? '';
        const title = isTopic && roomName ? `${roomName} 아젠다` : senderName;
        const body = isTopic && roomName ? `${senderName}: ${msg.fileUrl && msg.fileName ? msg.fileName : msg.content}` : (msg.fileUrl && msg.fileName ? msg.fileName : msg.content);
        const electronAPI = window.electronAPI;
        if (electronAPI?.showNotification) {
          (async () => {
            let icon: string | null = null;
            let imagePreview: string | null = null;
            const senderId = msg.senderId;
            if (senderId && token) {
              try {
                const base = getBaseUrl();
                if (electronAPI.fetchUserAvatar && base) {
                  icon = await Promise.race([
                    electronAPI.fetchUserAvatar(senderId, base, token),
                    new Promise<null>((r) => setTimeout(() => r(null), 250)),
                  ]);
                }
              } catch {
                // ignore
              }
            }
            if (msg.fileUrl && msg.fileMimeType?.startsWith('image/')) {
              try {
                const blob = await Promise.race([
                  filesApi.fetchBlob(msg.id),
                  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 400)),
                ]);
                imagePreview = await new Promise<string>((resolve, reject) => {
                  const r = new FileReader();
                  r.onload = () => resolve(r.result as string);
                  r.onerror = () => reject(new Error('read failed'));
                  r.readAsDataURL(blob);
                });
                if (imagePreview.length > 80 * 1024) imagePreview = null;
              } catch {
                // ignore
              }
            }
            try {
              electronAPI.showNotification(title, body, msg.roomId, icon, imagePreview);
            } catch {
              electronAPI.showNotification(title, body, msg.roomId);
            }
          })();
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          if (typeof document !== 'undefined' && document.hidden) new Notification(title, { body });
        }
      }
    });
    s.on('room_read', (payload: { roomId: string; userId: string }) => {
      const uid = myIdRef.current;
      if (payload.userId === uid) {
        if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
        return;
      }
      queryClient.setQueryData<InfiniteData<MessagesPage>>(['rooms', payload.roomId, 'messages'], (old) => {
        if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
        return { ...old, pages: old.pages.map((p) => ({ ...p, messages: (p.messages ?? []).map((m) => m.senderId === myIdRef.current ? { ...m, readCount: Math.max(m.readCount ?? 0, 1) } : m) })) };
      });
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
    });
    s.on('members_added', () => {
      const uid = myIdRef.current;
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
    });
    s.on('online_list', (payload: { userIds?: string[] }) => {
      setOnlineUserIds(new Set((payload.userIds || []).map((id) => String(id))));
    });
    s.on('user_online', (payload: { userId?: string; userName?: string | null }) => {
      if (payload.userId) setOnlineUserIds((prev) => new Set([...prev, String(payload.userId)]));
      if (payload.userId && String(payload.userId) !== String(myIdRef.current)) {
        const name = payload.userName?.trim() || '누군가';
        const title = 'EMAX';
        const body = `${name}님이 로그인했습니다.`;
        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification(title, body);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification(title, { body });
        }
      }
    });
    s.on('user_offline', (payload: { userId?: string }) => {
      if (payload.userId) setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(payload.userId));
        return next;
      });
    });
    s.on('connect', () => {
      s.emit('get_online_list');
    });
    s.on('user_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['org'] });
    });
    s.on('member_left', () => {
      queryClient.refetchQueries({ queryKey: ['rooms'] });
    });
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setSocketConnected(false);
    };
  }, [token, queryClient, myIdRef, recentTopicRoomRef, notificationsSnoozedUntilRef, mutedRoomIdsRef, setOnlineUserIds, setSocket, setSocketConnected, socketRef]);

  useEffect(() => {
    if (!socket || !socketConnected || !allRooms.length) return;
    allRooms.forEach((r) => socket.emit('join_room', r.id));
  }, [socket, socketConnected, allRooms]);
}
