import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore } from '../store';
import { roomsApi, orgApi, announcementApi, eventsApi, usersApi, getSocketUrl, type Room, type Message, type OrgCompany, type OrgUser, type Event } from '../api';
import CreateGroupModal from '../components/CreateGroupModal';

const STATUS_PRESETS = ['근무 중', '자리비움', '회의 중', '외근', '휴가'];

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconFriends({ filled }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconChat({ filled }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function IconSchedule({ filled }: { filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function openChatWindow(roomId: string) {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { electronAPI?: { openChatWindow?: (id: string) => void } }).electronAPI?.openChatWindow) {
    (window as unknown as { electronAPI: { openChatWindow: (id: string) => void } }).electronAPI.openChatWindow(roomId);
  } else {
    const url = `${window.location.origin}/chat/${roomId}`;
    window.open(url, '_blank', 'width=480,height=680');
  }
}

function toLocalInputValue(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function dateKeyWithTime(dateKey: string, time: string): string {
  return dateKey ? `${dateKey}T${time}` : '';
}

function normalizeTimeRange(dateKey: string, start?: string, end?: string) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const baseStart = dateKeyWithTime(dateKey, '09:00');
  const baseEnd = dateKeyWithTime(dateKey, '10:00');
  if (!s || Number.isNaN(s.getTime())) {
    return { startAt: baseStart, endAt: baseEnd };
  }
  if (!e || Number.isNaN(e.getTime())) {
    return { startAt: baseStart, endAt: baseEnd };
  }
  if (e.getTime() <= s.getTime()) {
    return { startAt: dateKeyWithTime(dateKey, '09:00'), endAt: dateKeyWithTime(dateKey, '10:00') };
  }
  return { startAt: dateKeyWithTime(dateKey, toLocalInputValue(s.toISOString()).slice(11)), endAt: dateKeyWithTime(dateKey, toLocalInputValue(e.toISOString()).slice(11)) };
}

export default function Main() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const myEmail = user?.email;
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const [activeTab, setActiveTab] = useState<'friends' | 'chat' | 'schedule' | 'more'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [announcementEdit, setAnnouncementEdit] = useState('');
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', startAt: '', endAt: '', description: '' });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const [treeOpen, setTreeOpen] = useState<Record<string, boolean>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; user: OrgUser } | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<OrgUser | null>(null);
  const [roomContextMenu, setRoomContextMenu] = useState<{ x: number; y: number; room: Room } | null>(null);
  const [statusInput, setStatusInput] = useState('');
  const [mutedRoomIds, setMutedRoomIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('mutedRoomIds');
      if (!raw) return new Set();
      const list = JSON.parse(raw);
      return new Set(Array.isArray(list) ? list.map(String) : []);
    } catch {
      return new Set();
    }
  });
  const [notificationsSnoozedUntil, setNotificationsSnoozedUntil] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('notificationsSnoozedUntil');
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  });
  const [showSnoozeEndToast, setShowSnoozeEndToast] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | undefined>(myId);
  const mutedRoomIdsRef = useRef<Set<string>>(mutedRoomIds);
  const notificationsSnoozedUntilRef = useRef<number>(notificationsSnoozedUntil);
  const statusSyncedRef = useRef(false);
  const queryClient = useQueryClient();
  myIdRef.current = myId;
  mutedRoomIdsRef.current = mutedRoomIds;
  notificationsSnoozedUntilRef.current = notificationsSnoozedUntil;
  const st = useMemo(() => getStyles(isDark), [isDark]);
  const notificationStatus =
    typeof Notification === 'undefined'
      ? '지원되지 않음'
      : Notification.permission === 'granted'
        ? '허용됨'
        : Notification.permission === 'denied'
          ? '차단됨'
          : '미정';

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (token && typeof window !== 'undefined' && (window as unknown as { electronAPI?: { windowResize?: (w: number, h: number) => void } }).electronAPI?.windowResize) {
      (window as unknown as { electronAPI: { windowResize: (w: number, h: number) => void } }).electronAPI.windowResize(400, 640);
    }
  }, [token]);

  const { data: roomsRaw = [], isError: roomsError } = useQuery({
    queryKey: ['rooms', myId],
    queryFn: roomsApi.list,
    enabled: !!myId,
  });
  const allRooms = (roomsRaw as Room[]) ?? [];
  const q = searchQuery.trim().toLowerCase();
  const rooms =
    activeTab === 'chat' && q
      ? allRooms.filter((r) => r.name?.toLowerCase().includes(q))
      : allRooms;

  const { data: orgTreeRaw = [], isLoading: orgLoading, isError: orgError, refetch: refetchOrg } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: orgApi.tree,
  });
  const orgTree = useMemo(() => {
    const tree = orgTreeRaw as OrgCompany[];
    if (activeTab !== 'friends') return tree;
    return tree
      .map((company) => ({
        ...company,
        departments: company.departments
          .map((dept) => ({
            ...dept,
            users: dept.users.filter((u) => {
              const nameMatch = !q || u.name?.toLowerCase().includes(q);
              const onlineMatch = !showOnlineOnly || onlineUserIds.has(String(u.id));
              return nameMatch && onlineMatch;
            }),
          }))
          .filter((dept) => dept.users.length > 0),
      }))
      .filter((company) => company.departments.length > 0);
  }, [orgTreeRaw, activeTab, q, showOnlineOnly, onlineUserIds]);

  const { data: onlineData } = useQuery({
    queryKey: ['org', 'online'],
    queryFn: orgApi.online,
    enabled: !!token,
  });
  const { data: announcementData } = useQuery({
    queryKey: ['announcement'],
    queryFn: announcementApi.get,
    enabled: !!token,
  });
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
    enabled: !!token,
  });
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    (events as Event[]).forEach((ev) => {
      const key = toLocalDateKey(ev.startAt);
      if (!key) return;
      const list = map.get(key) || [];
      list.push(ev);
      map.set(key, list);
    });
    return map;
  }, [events]);

  useEffect(() => {
    if (!selectedDate) return;
    setEventForm((prev) => {
      const normalized = normalizeTimeRange(selectedDate, prev.startAt, prev.endAt);
      return {
        ...prev,
        startAt: normalized.startAt,
        endAt: normalized.endAt,
      };
    });
  }, [selectedDate]);
  useEffect(() => {
    if (onlineData?.userIds) setOnlineUserIds(new Set(onlineData.userIds.map((id) => String(id))));
  }, [onlineData?.userIds]);
  useEffect(() => {
    if (announcementData?.content?.trim()) setShowAnnouncementModal(true);
  }, [announcementData?.content]);
  useEffect(() => {
    if (announcementData?.content !== undefined) setAnnouncementEdit(announcementData.content ?? '');
  }, [announcementData?.content]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const t = setTimeout(() => document.addEventListener('click', close), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!roomContextMenu) return;
    const close = () => setRoomContextMenu(null);
    const t = setTimeout(() => document.addEventListener('click', close), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [roomContextMenu]);

  useEffect(() => {
    if (statusSyncedRef.current || !myId) return;
    for (const company of (orgTreeRaw as OrgCompany[])) {
      for (const dept of company.departments) {
        const me = dept.users.find((u) => String(u.id) === String(myId));
        if (me) {
          setStatusInput(me.statusMessage || '');
          statusSyncedRef.current = true;
          return;
        }
      }
    }
  }, [orgTreeRaw, myId]);

  useEffect(() => {
    if (!token) return;
    if (socketRef.current?.connected) return;
    const url = getSocketUrl();
    const s = io(url, { path: '/socket.io', auth: { token } });
    socketRef.current = s;
    s.on('connect', () => {
      if (myIdRef.current) {
        setOnlineUserIds((prev) => new Set([...prev, String(myIdRef.current)]));
      }
    });
    s.on('message', (msg: Message) => {
      const withReadCount = { ...msg, readCount: msg.readCount ?? 0 };
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', msg.roomId, 'messages'],
        (old) => {
          if (!old) return { messages: [withReadCount], nextCursor: null, hasMore: false };
          if (old.messages.some((m) => m.id === msg.id)) return old;
          return { ...old, messages: [withReadCount, ...old.messages] };
        }
      );
      queryClient.refetchQueries({ queryKey: ['rooms'] });
      if (msg.senderId !== myIdRef.current) {
        if (notificationsSnoozedUntilRef.current > Date.now()) return;
        if (mutedRoomIdsRef.current.has(String(msg.roomId))) return;
        try {
          const activeRoomId = localStorage.getItem('activeChatRoomId');
          const activeFocused = localStorage.getItem('activeChatFocused') === '1';
          if (activeRoomId === msg.roomId && activeFocused) return;
        } catch {
          // ignore
        }
        const senderName = msg.sender?.name ?? '알 수 없음';
        const title = `04 Message - ${senderName}`;
        const body = msg.content;
        if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { showNotification?: (a: string, b: string) => void } }).electronAPI?.showNotification) {
          (window as unknown as { electronAPI: { showNotification: (a: string, b: string) => void } }).electronAPI.showNotification(title, body);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const inBackground = typeof document !== 'undefined' && document.hidden;
          if (inBackground) new Notification(title, { body });
        }
      }
    });
    s.on('room_read', (payload: { roomId: string; userId: string }) => {
      if (payload.userId === myIdRef.current) {
        queryClient.refetchQueries({ queryKey: ['rooms'] });
        return;
      }
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', payload.roomId, 'messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) =>
              m.senderId === myIdRef.current ? { ...m, readCount: Math.max(m.readCount ?? 0, 1) } : m
            ),
          };
        }
      );
      queryClient.refetchQueries({ queryKey: ['rooms'] });
      queryClient.refetchQueries({ queryKey: ['rooms', payload.roomId, 'messages'] });
    });
    s.on('online_list', (payload: { userIds?: string[] }) => {
      const ids = (payload.userIds || []).map((id) => String(id));
      setOnlineUserIds(new Set(ids));
    });
    s.on('user_online', (payload: { userId?: string }) => {
      if (payload.userId) setOnlineUserIds((prev) => new Set([...prev, String(payload.userId)]));
    });
    s.on('user_offline', (payload: { userId?: string }) => {
      if (payload.userId) setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(payload.userId));
        return next;
      });
    });
    s.on('user_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['org'] });
    });
    s.on('member_left', () => {
      queryClient.refetchQueries({ queryKey: ['rooms'] });
    });
    setSocket(s);
    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, queryClient]);

  useEffect(() => {
    if (!socket?.connected || !allRooms.length) return;
    allRooms.forEach((r) => socket.emit('join_room', r.id));
  }, [socket, allRooms]);

  const handleCreateRoom = async (userId: string) => {
    try {
      const room = await roomsApi.create(userId);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      openChatWindow(room.id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTree = (key: string) => {
    setTreeOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleFavorite = async (room: Room) => {
    try {
      await roomsApi.toggleFavorite(room.id, !room.isFavorite);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (err) {
      console.error(err);
    }
    setRoomContextMenu(null);
  };

  const handleToggleMuteRoom = (roomId: string) => {
    setMutedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      try {
        localStorage.setItem('mutedRoomIds', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
    setRoomContextMenu(null);
  };

  const snoozeNotifications = (minutes: number) => {
    const until = Date.now() + minutes * 60 * 1000;
    setNotificationsSnoozedUntil(until);
    try {
      localStorage.setItem('notificationsSnoozedUntil', String(until));
    } catch {
      // ignore
    }
  };

  const clearSnooze = () => {
    setNotificationsSnoozedUntil(0);
    try {
      localStorage.removeItem('notificationsSnoozedUntil');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!notificationsSnoozedUntil) return;
    const remaining = notificationsSnoozedUntil - Date.now();
    if (remaining <= 0) return;
    const t = setTimeout(() => {
      setNotificationsSnoozedUntil(0);
      try {
        localStorage.removeItem('notificationsSnoozedUntil');
      } catch {
        // ignore
      }
      setShowSnoozeEndToast(true);
      try {
        const title = 'EMAX';
        const body = '알림 일시 중지가 해제되었습니다';
        if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { showNotification?: (a: string, b: string) => void } }).electronAPI?.showNotification) {
          (window as unknown as { electronAPI: { showNotification: (a: string, b: string) => void } }).electronAPI.showNotification(title, body);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      } catch {
        // ignore
      }
      setTimeout(() => setShowSnoozeEndToast(false), 3000);
    }, remaining);
    return () => clearTimeout(t);
  }, [notificationsSnoozedUntil]);

  const handleLeaveRoom = async (roomId: string) => {
    if (!confirm('채팅방을 나가시겠습니까?')) { setRoomContextMenu(null); return; }
    try {
      await roomsApi.leave(roomId);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (err) {
      console.error(err);
    }
    setRoomContextMenu(null);
  };

  const handleSetStatus = async (msg: string) => {
    try {
      await usersApi.updateStatus(msg);
      setStatusInput(msg);
      queryClient.invalidateQueries({ queryKey: ['org'] });
    } catch (err) {
      console.error(err);
    }
  };

  const hasElectron = typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI;

  return (
    <div style={st.appWrap}>
      {hasElectron && (
        <div style={st.titleBar}>
          <div style={st.titleBarButtons}>
            <button
              type="button"
              style={st.titleBarBtn}
              onClick={() => (window as unknown as { electronAPI: { windowClose: () => void } }).electronAPI.windowClose()}
              aria-label="닫기"
            />
            <button
              type="button"
              style={st.titleBarBtn}
              onClick={() => (window as unknown as { electronAPI: { windowMinimize: () => void } }).electronAPI.windowMinimize()}
              aria-label="최소화"
            />
            <button
              type="button"
              style={st.titleBarBtn}
              onClick={() => (window as unknown as { electronAPI: { windowMaximize: () => void } }).electronAPI.windowMaximize()}
              aria-label="최대화"
            />
          </div>
          <span style={st.titleBarTitle}>EMAX</span>
        </div>
      )}
      <div style={st.layout}>
        {/* 상단 헤더 (캡처 디자인: 노란 바) */}
        <header style={st.tabHeader}>
          <h1 style={st.tabHeaderTitle}>
            {activeTab === 'chat' && '채팅'}
            {activeTab === 'friends' && '친구'}
            {activeTab === 'schedule' && '일정'}
            {activeTab === 'more' && '더보기'}
          </h1>
          <div style={st.tabHeaderIcons}>
            {activeTab === 'chat' && (
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                style={st.groupChatBtn}
                aria-label="새 채팅"
                title="1:1 또는 그룹 채팅 만들기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* 검색바 (채팅/친구 탭에서만) */}
        {(activeTab === 'chat' || activeTab === 'friends') && (
          <div style={st.searchWrap}>
            <span style={st.searchIcon} aria-hidden><SearchIcon /></span>
            <input
              type="text"
              placeholder="이름 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={st.searchInput}
            />
            {activeTab === 'friends' && (
              <button
                type="button"
                role="switch"
                aria-checked={showOnlineOnly}
                onClick={() => setShowOnlineOnly((v) => !v)}
                style={{
                  ...st.onlineFilterBtn,
                  ...(showOnlineOnly ? st.onlineFilterBtnActive : {}),
                }}
              >
                <span style={st.onlineFilterDot} />
                온라인만
              </button>
            )}
          </div>
        )}

        {/* 컨텐츠 영역 */}
        <div style={st.tabContent}>
          {activeTab === 'chat' && (
            <>
            {roomsError ? (
              <div style={st.treeError}>
                <p style={st.treeErrorText}>채팅 목록을 불러올 수 없습니다</p>
                <p style={st.treeErrorHint}>서버가 켜져 있는지 확인한 뒤 다시 시도해 주세요.</p>
              </div>
            ) : rooms.length === 0 ? (
              <div style={st.tabEmpty}>
                <p style={st.tabEmptyText}>채팅방이 없습니다</p>
                <p style={st.tabEmptyHint}>헤더의 + 버튼으로 새 채팅을 시작하세요</p>
              </div>
            ) : (
            <ul style={st.roomList}>
              {rooms.map((r) => (
                <li
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openChatWindow(r.id)}
                  onKeyDown={(e) => e.key === 'Enter' && openChatWindow(r.id)}
                  onContextMenu={(e) => { e.preventDefault(); setRoomContextMenu({ x: e.clientX, y: e.clientY, room: r }); }}
                  style={st.roomItem}
                >
                  <div style={st.roomAvatar} aria-hidden>
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" style={st.roomAvatarImg} />
                    ) : (
                      <span style={st.roomAvatarInitial}>
                        {r.name && r.name.trim().length > 0 ? r.name.trim()[0].toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <div style={st.roomInfo}>
                    <div style={st.roomName}>
                      {r.isFavorite && <span style={{ marginRight: 4, fontSize: 11 }}>{'\u2B50'}</span>}
                      {r.name}
                    </div>
                    <div style={st.roomPreview}>
                      {r.lastMessage ? r.lastMessage.content : '대화를 시작해보세요'}
                    </div>
                  </div>
                  <div style={st.roomMeta}>
                    {r.lastMessage && (
                      <span style={st.roomTime}>
                        {new Date(r.lastMessage.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {mutedRoomIds.has(r.id) && (
                      <span style={st.roomMuted} title="알림 꺼짐">알림 꺼짐</span>
                    )}
                    {(r.unreadCount ?? 0) > 0 && (
                      <span style={st.roomUnreadBadge}>{r.unreadCount! > 99 ? '99+' : r.unreadCount}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            )}
            </>
          )}

          {activeTab === 'friends' && (
            <div style={st.treeContainer}>
              {orgLoading ? (
                <p style={st.treeEmpty}>조직 데이터를 불러오는 중...</p>
              ) : orgError ? (
                <div style={st.treeError}>
                  <p style={st.treeErrorText}>조직 데이터를 불러올 수 없습니다.</p>
                  <p style={st.treeErrorHint}>서버가 켜져 있는지 확인한 뒤 다시 시도해 주세요.</p>
                  <button type="button" onClick={() => refetchOrg()} style={st.treeRetryBtn}>
                    다시 시도
                  </button>
                </div>
              ) : orgTree.length === 0 ? (
                <p style={st.treeEmpty}>표시할 조직이 없습니다.</p>
              ) : (
                orgTree.map((company: OrgCompany) => {
                  const companyKey = `company-${company.id}`;
                  const companyOpen = treeOpen[companyKey] !== false;
                  return (
                    <div key={company.id} style={st.treeBlock}>
                      <button
                        type="button"
                        style={st.treeNode}
                        onClick={() => toggleTree(companyKey)}
                        aria-expanded={companyOpen}
                      >
                        <span style={st.treeChevron}>{companyOpen ? '▼' : '▶'}</span>
                        <span style={st.treeLabelCompany}>{company.name}</span>
                      </button>
                      {companyOpen &&
                        company.departments.map((dept) => {
                          const deptKey = `dept-${dept.id}`;
                          const deptOpen = treeOpen[deptKey] !== false;
                          return (
                            <div key={dept.id} style={st.treeIndent}>
                              <button
                                type="button"
                                style={st.treeNode}
                                onClick={() => toggleTree(deptKey)}
                                aria-expanded={deptOpen}
                              >
                                <span style={st.treeChevron}>{deptOpen ? '▼' : '▶'}</span>
                                <span style={st.treeLabelDept}>{dept.name}</span>
                              </button>
                              {deptOpen && (
                                <ul style={st.treeUserList}>
                                  {dept.users.map((user) => {
                                    const isOnline = onlineUserIds.has(String(user.id)) || (String(user.id) === String(myId) && !!socket?.connected);
                                    return (
                                      <li key={user.id} style={st.treeUserItem}>
                                        <button
                                          type="button"
                                          style={{
                                            ...st.treeUserBtn,
                                            ...(!isOnline ? st.treeUserBtnOffline : {}),
                                          }}
                                          onClick={async () => {
                                            try {
                                              const room = await roomsApi.create(user.id);
                                              queryClient.invalidateQueries({ queryKey: ['rooms'] });
                                              openChatWindow(room.id);
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, user });
                                          }}
                                        >
                                          <div style={st.treeUserAvatar} aria-hidden>
                                            {user.avatarUrl ? (
                                              <img src={user.avatarUrl} alt="" style={st.treeUserAvatarImg} />
                                            ) : (
                                              <span style={st.treeUserAvatarInitial}>
                                                {user.name.trim().length > 0 ? user.name.trim()[0].toUpperCase() : '?'}
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ ...st.treeUserName, ...(!isOnline ? st.treeUserNameOffline : {}) }}>
                                              {user.name}
                                            </span>
                                            {user.statusMessage && (
                                              <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user.statusMessage}
                                              </div>
                                            )}
                                          </div>
                                          {isOnline && (
                                            <span style={st.treeOnlineDot} title="온라인" />
                                          )}
                                          {(String(user.id) === String(myId) || user.email === myEmail) && (
                                            <span style={st.treeMe}>(나)</span>
                                          )}
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div style={st.schedulePanel}>
              <div style={st.scheduleGrid}>
                <div style={st.scheduleCol}>
                  <div style={st.calendarWrap}>
                    <div style={st.calendarHeader}>
                      <button type="button" style={st.calendarNavBtn} onClick={() => setCalendarMonth((m) => addMonths(m, -1))}>
                        ◀
                      </button>
                      <div style={st.calendarTitle}>
                        {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
                      </div>
                      <button type="button" style={st.calendarNavBtn} onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>
                        ▶
                      </button>
                    </div>
                    <div style={st.calendarGrid}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                        <div key={d} style={st.calendarDow}>{d}</div>
                      ))}
                      {(() => {
                        const start = startOfMonth(calendarMonth);
                        const firstDow = start.getDay();
                        const totalDays = daysInMonth(calendarMonth);
                        const cells = [];
                        for (let i = 0; i < firstDow; i += 1) {
                          cells.push(<div key={`empty-${i}`} style={st.calendarCellEmpty} />);
                        }
                        for (let day = 1; day <= totalDays; day += 1) {
                          const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const list = eventsByDate.get(key) || [];
                          const isSelected = key === selectedDate;
                          const isToday = key === toLocalDateKey(new Date().toISOString());
                          cells.push(
                            <button
                              type="button"
                              key={key}
                              style={{
                                ...st.calendarCell,
                                ...(isSelected ? st.calendarCellSelected : {}),
                                ...(isToday ? st.calendarCellToday : {}),
                              }}
                          onClick={() => {
                            setSelectedDate(key);
                          }}
                        >
                              <span style={st.calendarDay}>{day}</span>
                              {list.length > 0 && (
                                <span style={st.calendarBadge}>{list.length}</span>
                              )}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <div style={st.calendarSelectedRow}>
                      <span style={st.calendarSelected}>선택한 날짜: {selectedDate}</span>
                      <button
                        type="button"
                        style={st.calendarTodayBtn}
                        onClick={() => {
                          const key = toLocalDateKey(new Date().toISOString());
                          if (key) {
                            setSelectedDate(key);
                            setCalendarMonth(startOfMonth(new Date()));
                          }
                        }}
                      >
                        오늘
                      </button>
                    </div>
                  </div>
                </div>
                <div style={st.scheduleCol}>
                  <div style={st.scheduleForm}>
                    <input
                      type="text"
                      placeholder="제목"
                      value={eventForm.title}
                      onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
                      style={st.scheduleInput}
                    />
                    <div style={st.scheduleRow}>
                      <input
                        type="datetime-local"
                        value={eventForm.startAt}
                        onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))}
                        style={st.scheduleInput}
                      />
                      <span style={st.scheduleDash}>~</span>
                      <input
                        type="datetime-local"
                        value={eventForm.endAt}
                        onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))}
                        style={st.scheduleInput}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="설명 (선택)"
                      value={eventForm.description}
                      onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                      style={st.scheduleInput}
                    />
                    <div style={st.scheduleFormBtns}>
                      {editingEventId ? (
                        <>
                          <button
                            type="button"
                            style={st.scheduleBtn}
                            onClick={async () => {
                              if (!editingEventId || !eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
                              try {
                            await eventsApi.update(editingEventId, {
                              title: eventForm.title.trim(),
                              startAt: eventForm.startAt,
                              endAt: eventForm.endAt,
                              description: eventForm.description.trim() || undefined,
                            });
                            queryClient.invalidateQueries({ queryKey: ['events'] });
                            setEditingEventId(null);
                            const normalized = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt);
                            setEventForm({ title: '', startAt: normalized.startAt, endAt: normalized.endAt, description: '' });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                          >
                            수정
                          </button>
                          <button type="button" style={st.scheduleBtnCancel} onClick={() => { setEditingEventId(null); setEventForm({ title: '', startAt: '', endAt: '', description: '' }); }}>
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          style={st.scheduleBtn}
                          onClick={async () => {
                            if (!eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
                          try {
                            await eventsApi.create({
                              title: eventForm.title.trim(),
                              startAt: eventForm.startAt,
                              endAt: eventForm.endAt,
                              description: eventForm.description.trim() || undefined,
                            });
                            queryClient.invalidateQueries({ queryKey: ['events'] });
                            const normalized = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt);
                            setEventForm({ title: '', startAt: normalized.startAt, endAt: normalized.endAt, description: '' });
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        >
                          추가
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={st.scheduleListHeader}>
                    <span style={st.scheduleListTitle}>선택한 날짜 일정</span>
                    <span style={st.scheduleListCount}>{(eventsByDate.get(selectedDate) || []).length}건</span>
                  </div>
                  <ul style={st.scheduleList}>
                    {((eventsByDate.get(selectedDate) || []) as Event[]).map((ev) => (
                      <li key={ev.id} style={st.scheduleItem}>
                        <div style={st.scheduleItemBody}>
                          <strong style={st.scheduleItemTitle}>{ev.title}</strong>
                          <span style={st.scheduleItemTime}>
                            {new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}
                          </span>
                          {ev.description && <span style={st.scheduleItemDesc}>{ev.description}</span>}
                        </div>
                        <div style={st.scheduleItemActions}>
                          <button type="button" style={st.scheduleItemBtn} onClick={() => {
                              setEditingEventId(ev.id);
                              const s = toLocalInputValue(ev.startAt);
                              const e = toLocalInputValue(ev.endAt);
                              setEventForm({ title: ev.title, startAt: s, endAt: e, description: ev.description ?? '' });
                            }}>
                            수정
                          </button>
                          <button
                            type="button"
                            style={st.scheduleItemBtnDelete}
                            onClick={async () => {
                              try {
                                await eventsApi.delete(ev.id);
                                queryClient.invalidateQueries({ queryKey: ['events'] });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {(eventsByDate.get(selectedDate) || []).length === 0 && (
                    <p style={st.treeEmpty}>선택한 날짜에 일정이 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'more' && (
            <div style={st.morePanel}>
              {notificationsSnoozedUntil > Date.now() && (
                <div style={st.snoozeBadge}>알림 일시 중지 중</div>
              )}
              <div style={st.snoozeSection}>
                <div style={st.snoozeTitle}>알림 일시 중지</div>
                {notificationsSnoozedUntil > Date.now() ? (
                  <div style={st.snoozeActive}>
                    <span>해제 시간: {new Date(notificationsSnoozedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button type="button" style={st.snoozeBtn} onClick={clearSnooze}>해제</button>
                  </div>
                ) : (
                  <div style={st.snoozeButtons}>
                    <button type="button" style={st.snoozeBtn} onClick={() => snoozeNotifications(10)}>10분</button>
                    <button type="button" style={st.snoozeBtn} onClick={() => snoozeNotifications(60)}>1시간</button>
                  </div>
                )}
              </div>
              {/* 다크 모드 토글 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#e2e8f0' : '#333' }}>다크 모드</span>
                <button
                  type="button"
                  onClick={toggleDark}
                  style={{ width: 48, height: 28, borderRadius: 14, border: 'none', background: isDark ? '#6366f1' : '#e5e7eb', cursor: 'pointer', position: 'relative' as const, padding: 0, flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute' as const, top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>

              {/* 상태 메시지 */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>상태 메시지</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {STATUS_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      style={{
                        padding: '6px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer', border: 'none',
                        background: statusInput === p ? '#475569' : (isDark ? '#475569' : '#e5e7eb'),
                        color: statusInput === p ? '#fff' : (isDark ? '#94a3b8' : '#666'),
                        fontWeight: statusInput === p ? 600 : 400,
                      }}
                      onClick={() => handleSetStatus(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="직접 입력..."
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetStatus(statusInput)}
                    style={{ flex: 1, padding: '8px 12px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#333', outline: 'none' }}
                  />
                  <button
                    type="button"
                    style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => handleSetStatus(statusInput)}
                  >
                    설정
                  </button>
                </div>
                {statusInput && (
                  <button
                    type="button"
                    style={{ marginTop: 8, padding: '6px 12px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, background: 'none', color: isDark ? '#94a3b8' : '#888', fontSize: 12, cursor: 'pointer', width: '100%' }}
                    onClick={() => { handleSetStatus(''); setStatusInput(''); }}
                  >
                    상태 초기화
                  </button>
                )}
              </div>

              <div style={st.noticeStatus}>
                <span>알림 상태: {notificationStatus}</span>
                {hasElectron && <span style={st.noticeHint}>OS 설정에서 알림을 허용해야 합니다.</span>}
              </div>
              {user?.isAdmin && (
                <div style={st.announcementSection}>
                  <h4 style={st.announcementSectionTitle}>공지 등록</h4>
                  <textarea
                    value={announcementEdit}
                    onChange={(e) => setAnnouncementEdit(e.target.value)}
                    placeholder="공지 내용을 입력하세요. 로그인 시 팝업으로 표시됩니다."
                    style={st.announcementTextarea}
                    rows={4}
                  />
                  <button
                    type="button"
                    style={st.announcementSaveBtn}
                    disabled={announcementSaving}
                    onClick={async () => {
                      setAnnouncementSaving(true);
                      try {
                        await announcementApi.put(announcementEdit);
                        queryClient.invalidateQueries({ queryKey: ['announcement'] });
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setAnnouncementSaving(false);
                      }
                    }}
                  >
                    {announcementSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              )}
              {hasElectron && (
                <>
                  <button
                    type="button"
                    style={st.moreBtn}
                    onClick={() => (window as unknown as { electronAPI: { showNotification: (a: string, b: string) => void } }).electronAPI.showNotification('EMAX', '알림 테스트입니다.')}
                  >
                    알림 테스트
                  </button>
                  <button
                    type="button"
                    style={st.moreBtn}
                    onClick={() => (window as unknown as { electronAPI: { openSecondWindow: () => void } }).electronAPI.openSecondWindow()}
                  >
                    테스트: 새 창 열기
                  </button>
                </>
              )}
              {!hasElectron && (
                <button
                  type="button"
                  style={st.moreBtn}
                  onClick={requestNotificationPermission}
                >
                  알림 권한 요청
                </button>
              )}
              <button
                type="button"
                style={st.moreBtnLogout}
                onClick={() => {
                  queryClient.removeQueries({ queryKey: ['rooms'] });
                  queryClient.removeQueries({ queryKey: ['org'] });
                  logout();
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>

        {/* 하단 탭 네비게이션 */}
        <nav style={st.bottomNav}>
          <button
            type="button"
            style={{ ...st.bottomNavItem, ...(activeTab === 'friends' ? st.bottomNavItemActive : {}) }}
            onClick={() => setActiveTab('friends')}
          >
            <span style={st.bottomNavIcon}><IconFriends filled={activeTab === 'friends'} /></span>
            <span>친구</span>
          </button>
          <button
            type="button"
            style={{ ...st.bottomNavItem, ...(activeTab === 'chat' ? st.bottomNavItemActive : {}) }}
            onClick={() => setActiveTab('chat')}
          >
            <span style={st.bottomNavIcon}><IconChat filled={activeTab === 'chat'} /></span>
            <span style={st.navLabel}>채팅</span>
          </button>
          <button
            type="button"
            style={{ ...st.bottomNavItem, ...(activeTab === 'schedule' ? st.bottomNavItemActive : {}) }}
            onClick={() => setActiveTab('schedule')}
          >
            <span style={st.bottomNavIcon}><IconSchedule filled={activeTab === 'schedule'} /></span>
            <span style={st.navLabel}>일정</span>
          </button>
          <button
            type="button"
            style={{ ...st.bottomNavItem, ...(activeTab === 'more' ? st.bottomNavItemActive : {}) }}
            onClick={() => setActiveTab('more')}
          >
            <span style={st.bottomNavIcon}><IconMore /></span>
            <span style={st.navLabel}>
              더보기
              {notificationsSnoozedUntil > Date.now() && <span style={st.snoozeDot} />}
            </span>
          </button>
        </nav>
      </div>

      {showAnnouncementModal && announcementData?.content?.trim() && (
        <div style={st.announcementOverlay} onClick={() => setShowAnnouncementModal(false)}>
          <div style={st.announcementModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={st.announcementTitle}>공지</h3>
            <div style={st.announcementBody}>{announcementData.content}</div>
            <button type="button" style={st.announcementBtn} onClick={() => setShowAnnouncementModal(false)}>
              확인
            </button>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreated={(roomId) => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            openChatWindow(roomId);
          }}
        />
      )}

      {contextMenu && (
        <div
          style={{
            ...st.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={st.contextMenuItem}
            onClick={() => {
              setProfileModalUser(contextMenu.user);
              setContextMenu(null);
            }}
          >
            프로필 보기
          </button>
        </div>
      )}

      {roomContextMenu && (
        <div
          style={{
            ...st.contextMenu,
            left: roomContextMenu.x,
            top: roomContextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={st.contextMenuItem}
            onClick={() => handleToggleFavorite(roomContextMenu.room)}
          >
            {roomContextMenu.room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
          </button>
          <button
            type="button"
            style={st.contextMenuItem}
            onClick={() => handleToggleMuteRoom(roomContextMenu.room.id)}
          >
            {mutedRoomIds.has(roomContextMenu.room.id) ? '알림 켜기' : '알림 끄기'}
          </button>
          <button
            type="button"
            style={{ ...st.contextMenuItem, color: '#c62828' }}
            onClick={() => handleLeaveRoom(roomContextMenu.room.id)}
          >
            나가기
          </button>
        </div>
      )}

      {profileModalUser && (
        <div style={st.profileOverlay} onClick={() => setProfileModalUser(null)}>
          <div style={st.profileModal} onClick={(e) => e.stopPropagation()}>
            <div style={st.profileHeader}>
              <h3 style={st.profileTitle}>사용자 프로필</h3>
              <button type="button" style={st.profileClose} onClick={() => setProfileModalUser(null)} aria-label="닫기">
                ×
              </button>
            </div>
            <div style={st.profileBody}>
              <p style={st.profileRow}>
                <strong>이름</strong> {profileModalUser.name}
              </p>
              <p style={st.profileRow}>
                <strong>이메일</strong> {profileModalUser.email}
              </p>
              <p style={st.profileRow}>
                <strong>상태</strong>{' '}
                {onlineUserIds.has(String(profileModalUser.id)) ? (
                  <span style={st.profileOnline}>● 온라인</span>
                ) : (
                  <span style={st.profileOffline}>○ 오프라인</span>
                )}
              </p>
              {profileModalUser.statusMessage && (
                <p style={st.profileRow}>
                  <strong>상태 메시지</strong> {profileModalUser.statusMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showSnoozeEndToast && (
        <div style={st.toast}>
          알림 일시 중지가 해제되었습니다
        </div>
      )}
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const bg = isDark ? '#0f172a' : '#fff';
  const contentBg = isDark ? '#1e293b' : '#fff';
  const cardBg = isDark ? '#334155' : '#f5f5f5';
  const text = isDark ? '#e2e8f0' : '#333';
  const textStrong = isDark ? '#f1f5f9' : '#111827';
  const sub = isDark ? '#94a3b8' : '#888';
  const muted = isDark ? '#64748b' : '#666';
  const border = isDark ? '#475569' : '#eee';
  const borderLight = isDark ? '#475569' : '#f0f0f0';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const inputBorder = isDark ? '#475569' : '#e5e7eb';
  const headerBg = isDark ? '#1e293b' : '#475569';

  return {
    appWrap: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: bg },
    titleBar: { flexShrink: 0, height: 38, minHeight: 38, display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 8, background: contentBg, borderBottom: `1px solid ${border}`, WebkitAppRegion: 'drag' },
    titleBarButtons: { display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' },
    titleBarBtn: { width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#c0c0c0', cursor: 'pointer', padding: 0, boxShadow: 'none', outline: 'none', WebkitAppearance: 'none', appearance: 'none' },
    titleBarTitle: { flex: 1, textAlign: 'center' as const, fontSize: 13, fontWeight: 600, color: text, pointerEvents: 'none' as const },
    layout: { display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, background: bg },
    tabHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, minHeight: 50, padding: '0 16px', background: headerBg, position: 'relative' as const, zIndex: 20, overflow: 'visible' },
    tabHeaderTitle: { margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' },
    tabHeaderIcons: { display: 'flex', alignItems: 'center', gap: 8 },
    groupChatBtn: {
      width: 30,
      height: 30,
      padding: 0,
      border: 'none',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.2)',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabHeaderIconBtn: { width: 36, height: 36, padding: 0, border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    searchWrap: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: contentBg, borderBottom: `1px solid ${borderLight}` },
    searchIcon: { color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    searchInput: { flex: 1, padding: '10px 12px', border: 'none', borderRadius: 10, fontSize: 14, background: inputBg, color: text, outline: 'none' },
    onlineFilterBtn: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '8px 14px', border: `1px solid ${inputBorder}`, borderRadius: 20, background: contentBg, color: isDark ? '#94a3b8' : '#6b7280', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' },
    onlineFilterBtnActive: { borderColor: '#475569', background: '#475569', color: '#fff' },
    onlineFilterDot: { width: 6, height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.7 },
    tabContent: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', background: bg },
    tabEmpty: { padding: 32, textAlign: 'center' as const },
    tabEmptyText: { fontSize: 16, fontWeight: 600, color: text, marginBottom: 8 },
    tabEmptyHint: { fontSize: 14, color: sub, margin: 0 },
    sidebar: { width: 340, borderRight: `1px solid ${border}`, display: 'flex', flexDirection: 'column', background: contentBg, boxShadow: '2px 0 8px rgba(0,0,0,0.06)' },
    sidebarHeader: { padding: '14px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: contentBg },
    logo: { fontWeight: 700, fontSize: 20, color: text },
    headerButtons: { display: 'flex', gap: 6, alignItems: 'center' },
    testBtn: { padding: '6px 10px', border: 'none', borderRadius: 6, background: '#fae100', color: '#3c1e1e', cursor: 'pointer', fontSize: 11, fontWeight: 600 },
    logoutBtn: { padding: '6px 12px', border: 'none', borderRadius: 6, background: cardBg, color: text, cursor: 'pointer', fontSize: 12 },
    roomList: { listStyle: 'none', margin: 0, padding: 0, overflow: 'auto', flex: 1 },
    roomItem: { padding: '14px 16px', borderBottom: `1px solid ${borderLight}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 },
    roomAvatar: { position: 'relative' as const, width: 48, height: 48, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    roomAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
    roomAvatarInitial: { fontSize: 14, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60, 30, 30, 0.85)' },
    unreadBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#e53935', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    roomInfo: { flex: 1, minWidth: 0 },
    roomName: { fontWeight: 600, fontSize: 13, color: text, marginBottom: 2, display: 'flex', alignItems: 'center' },
    roomPreview: { fontSize: 12, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    roomMeta: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
    roomMuted: { fontSize: 11, color: '#94a3b8' },
    roomTime: { fontSize: 11, color: sub },
    roomUnreadBadge: { minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#e53935', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    morePanel: { padding: 24, display: 'flex', flexDirection: 'column', gap: 12 },
    snoozeSection: { padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 },
    snoozeTitle: { fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' },
    snoozeButtons: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    snoozeBtn: { padding: '6px 12px', border: `1px solid ${inputBorder}`, borderRadius: 8, background: contentBg, fontSize: 12, cursor: 'pointer' },
    snoozeActive: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: muted },
    snoozeBadge: { padding: '6px 10px', borderRadius: 999, background: isDark ? '#6366f1' : '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' },
    snoozeSection: { padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 },
    snoozeTitle: { fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' },
    snoozeButtons: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    snoozeBtn: { padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 12, cursor: 'pointer' },
    snoozeActive: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' },
    noticeStatus: { padding: '10px 12px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', color: isDark ? '#94a3b8' : '#334155', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 },
    noticeHint: { fontSize: 12, color: muted },
    moreBtn: { padding: '12px 16px', border: 'none', borderRadius: 10, background: cardBg, color: text, cursor: 'pointer', fontSize: 14, textAlign: 'left' as const },
    moreBtnLogout: { padding: '12px 16px', border: 'none', borderRadius: 10, background: isDark ? '#334155' : '#f0f0f0', color: '#c62828', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left' as const, marginTop: 8 },
    bottomNav: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 12px', background: contentBg, borderTop: `1px solid ${border}` },
    bottomNavItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: sub },
    navLabel: { position: 'relative' as const, display: 'inline-flex', alignItems: 'center', gap: 6 },
    snoozeDot: { width: 6, height: 6, borderRadius: 999, background: '#f59e0b', display: 'inline-block' },
    bottomNavItemActive: { color: text, fontWeight: 600 },
    bottomNavIcon: { fontSize: 16, lineHeight: 1 },
    main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: bg, boxShadow: 'inset 2px 0 8px rgba(0,0,0,0.04)' },
    treeContainer: { flex: 1, overflow: 'auto', padding: '16px 12px' },
    treeEmpty: { color: sub, fontSize: 13 },
    treeError: { padding: 20, textAlign: 'center' as const },
    treeErrorText: { color: '#c62828', fontSize: 14, fontWeight: 600, marginBottom: 6 },
    treeErrorHint: { color: muted, fontSize: 13, marginBottom: 12 },
    treeRetryBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
    treeBlock: { marginBottom: 6 },
    treeIndent: { marginLeft: 16, marginTop: 2 },
    treeNode: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151' },
    treeChevron: { fontSize: 9, color: isDark ? '#64748b' : '#9ca3af', flexShrink: 0 },
    treeLabelCompany: { fontWeight: 600, fontSize: 14, color: textStrong },
    treeLabelDept: { fontWeight: 500, fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' },
    treeUserList: { listStyle: 'none', margin: 0, padding: 0, marginTop: 2 },
    treeUserItem: { marginBottom: 1 },
    treeUserBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: isDark ? '#cbd5e1' : '#374151', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: 13 },
    treeUserBtnOffline: { background: 'transparent', opacity: 0.7, color: isDark ? '#64748b' : '#9ca3af' },
    treeUserAvatar: { position: 'relative' as const, width: 32, height: 32, borderRadius: '50%', background: isDark ? '#475569' : '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    treeUserAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
    treeUserAvatarInitial: { fontSize: 13, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280' },
    treeUserName: { color: isDark ? '#cbd5e1' : '#374151', fontWeight: 500, fontSize: 13 },
    treeUserNameOffline: { color: isDark ? '#64748b' : '#9ca3af', fontWeight: 400, fontSize: 13 },
    treeMe: { fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' },
    treeOnlineDot: { width: 6, height: 6, borderRadius: 3, background: '#22c55e', flexShrink: 0, marginLeft: 4 },
    contextMenu: { position: 'fixed', zIndex: 10000, minWidth: 140, padding: 4, background: isDark ? '#334155' : '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: `1px solid ${border}` },
    contextMenuItem: { display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', borderRadius: 6, fontSize: 14, color: text, textAlign: 'left' as const, cursor: 'pointer' },
    announcementOverlay: { position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    announcementModal: { background: contentBg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: 20 },
    announcementTitle: { margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: text },
    announcementBody: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#555', marginBottom: 16 },
    announcementBtn: { padding: '10px 20px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' },
    announcementSection: { marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${border}` },
    announcementSectionTitle: { margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: text },
    announcementTextarea: { width: '100%', padding: 12, border: `1px solid ${inputBorder}`, borderRadius: 8, fontSize: 14, lineHeight: 1.5, resize: 'vertical' as const, marginBottom: 10, boxSizing: 'border-box' as const, background: isDark ? '#334155' : '#fff', color: text },
    announcementSaveBtn: { padding: '10px 20px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    schedulePanel: { padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflowX: 'hidden', maxWidth: '100%' },
    scheduleGrid: { display: 'flex', flexWrap: 'wrap', gap: 16, width: '100%' },
    scheduleCol: { flex: '1 1 320px', minWidth: 0 },
    calendarWrap: { border: `1px solid ${inputBorder}`, borderRadius: 12, padding: 12, background: contentBg, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
    calendarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    calendarTitle: { fontSize: 15, fontWeight: 700, color: textStrong },
    calendarNavBtn: { border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 },
    calendarGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, width: '100%' },
    calendarDow: { textAlign: 'center' as const, fontSize: 12, color: muted, padding: '4px 0' },
    calendarCell: { height: 56, borderRadius: 10, border: `1px solid ${isDark ? '#334155' : '#eef2f7'}`, background: isDark ? '#1e293b' : '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', minWidth: 0, color: text },
    calendarCellEmpty: { height: 56 },
    calendarCellSelected: { background: '#475569', color: '#fff', borderColor: '#475569' },
    calendarCellToday: { boxShadow: 'inset 0 0 0 2px #94a3b8' },
    calendarDay: { fontSize: 14, fontWeight: 700 },
    calendarBadge: { fontSize: 11, fontWeight: 700, background: isDark ? '#6366f1' : '#0f172a', color: '#fff', borderRadius: 10, padding: '2px 6px' },
    calendarSelectedRow: { marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    calendarSelected: { marginTop: 8, fontSize: 12, color: muted },
    calendarTodayBtn: { border: `1px solid ${inputBorder}`, background: contentBg, color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
    scheduleForm: { marginBottom: 20 },
    scheduleListHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    scheduleListTitle: { fontSize: 13, fontWeight: 700, color: textStrong },
    scheduleListCount: { fontSize: 12, color: muted },
    scheduleInput: { width: '100%', padding: '10px 12px', border: `1px solid ${inputBorder}`, borderRadius: 8, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' as const, minWidth: 0, background: isDark ? '#334155' : '#fff', color: text },
    scheduleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
    scheduleDash: { color: sub, fontSize: 14 },
    scheduleFormBtns: { display: 'flex', gap: 8, marginTop: 10 },
    scheduleBtn: { padding: '10px 20px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    scheduleBtnCancel: { padding: '10px 20px', border: `1px solid ${inputBorder}`, borderRadius: 8, background: contentBg, color: muted, fontSize: 14, cursor: 'pointer' },
    scheduleList: { listStyle: 'none', margin: 0, padding: 0 },
    scheduleItem: { padding: 12, borderBottom: `1px solid ${borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    scheduleItemBody: { flex: 1, minWidth: 0 },
    scheduleItemTitle: { display: 'block', fontSize: 14, fontWeight: 600, color: text, marginBottom: 4 },
    scheduleItemTime: { display: 'block', fontSize: 12, color: sub, marginBottom: 4 },
    scheduleItemDesc: { display: 'block', fontSize: 13, color: muted },
    scheduleItemActions: { display: 'flex', gap: 6, flexShrink: 0 },
    scheduleItemBtn: { padding: '6px 12px', border: 'none', borderRadius: 6, background: '#475569', color: '#fff', fontSize: 12, cursor: 'pointer' },
    scheduleItemBtnDelete: { padding: '6px 12px', border: `1px solid ${inputBorder}`, borderRadius: 6, background: contentBg, color: '#c62828', fontSize: 12, cursor: 'pointer' },
    profileOverlay: { position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    profileModal: { background: contentBg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%' },
    profileHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` },
    profileTitle: { margin: 0, fontSize: 18, fontWeight: 600, color: text },
    profileClose: { border: 'none', background: 'none', fontSize: 24, color: muted, cursor: 'pointer', lineHeight: 1, padding: 0 },
    profileBody: { padding: 20 },
    profileRow: { margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' },
    profileOnline: { color: '#4caf50', fontWeight: 600 },
    profileOffline: { color: isDark ? '#64748b' : '#999' },
    toast: {
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#0f172a',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: 999,
      fontSize: 12,
      boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
      zIndex: 100000,
    },
  };
}
