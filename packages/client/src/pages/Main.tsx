import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore, useToastStore } from '../store';
import { roomsApi, orgApi, announcementApi, eventsApi, usersApi, bookmarksApi, mentionsApi, foldersApi, filesApi, getSocketUrl, getBaseUrl, authApi, navigateToLogin, type Room, type Message, type OrgCompany, type OrgUser, type Event, type PublicRoom, type Folder } from '../api';
import { ollamaChat, getOllamaConfig, type OllamaMessage } from '../ollama';
import ToastProvider from '../components/ui/ToastProvider';
import CreateGroupModal from '../components/CreateGroupModal';
import FolderManageModal from '../components/FolderManageModal';
import AvatarEditModal from '../components/AvatarEditModal';
import RoomAvatar from '../components/RoomAvatar';
import UserAvatar from '../components/UserAvatar';
import GroupAvatar from '../components/GroupAvatar';
import TitleBar from '../components/TitleBar';
import ChatWindow from './ChatWindow';
import { getThemeTokens } from '../components/ui/themeTokens';
import UIChevron from '../components/ui/UIChevron';
import UICloseButton from '../components/ui/UICloseButton';

const STATUS_OPTIONS = [
  { id: '', label: '설정 안 함' },
  { id: '자리 비움', label: '자리 비움' },
  { id: '회의 중', label: '회의 중' },
  { id: '외근', label: '외근' },
  { id: '휴가', label: '휴가' },
];

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  // 자리 비움: 주황 시계
  if (status === '자리 비움') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="#f97316" />
        <circle cx="8" cy="8" r="3.5" fill="none" stroke="white" strokeWidth="1.3" />
        <line x1="8" y1="8" x2="8" y2="5.3" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="8" y1="8" x2="10" y2="8" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  // 회의 중: 파란 말풍선
  if (status === '회의 중') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="#3b82f6" />
        <rect x="4.5" y="5.5" width="7" height="4.5" rx="1.2" fill="white" opacity="0.95" />
        <polygon points="6,10 5,12 7.5,10" fill="white" opacity="0.95" />
      </svg>
    );
  }
  // 외근: 갈색/빨간 자동차
  if (status === '외근') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="#ef4444" />
        <rect x="3.5" y="7.5" width="9" height="3" rx="0.8" fill="white" />
        <path d="M5 7.5 L6.5 5.5 H9.5 L11 7.5Z" fill="white" />
        <circle cx="5.5" cy="10.5" r="1" fill="#ef4444" />
        <circle cx="10.5" cy="10.5" r="1" fill="#ef4444" />
      </svg>
    );
  }
  // 휴가: 초록 야자수 / 태양
  if (status === '휴가') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flexShrink: 0 }}>
        <circle cx="8" cy="8" r="7" fill="#22c55e" />
        <circle cx="8" cy="7" r="2.3" fill="white" opacity="0.95" />
        <line x1="8" y1="4.2" x2="8" y2="3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="8" y1="9.8" x2="8" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.2" y1="7" x2="4" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="10.8" y1="7" x2="12" y2="7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="6.1" y1="5.1" x2="5.3" y2="4.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9.9" y1="8.9" x2="10.7" y2="9.7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9.9" y1="5.1" x2="10.7" y2="4.3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="6.1" y1="8.9" x2="5.3" y2="9.7" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function openChatWindow(roomId: string) {
  if (window.electronAPI?.openChatWindow) {
    window.electronAPI.openChatWindow(roomId);
  } else {
    window.open(`${window.location.origin}/chat/${roomId}`, '_blank', 'width=480,height=680');
  }
}

function toLocalInputValue(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date): number { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
function addMonths(d: Date, delta: number): Date { return new Date(d.getFullYear(), d.getMonth() + delta, 1); }
function dateKeyWithTime(dateKey: string, time: string): string { return dateKey ? `${dateKey}T${time}` : ''; }

function normalizeTimeRange(dateKey: string, start?: string, end?: string) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const baseStart = dateKeyWithTime(dateKey, '09:00');
  const baseEnd = dateKeyWithTime(dateKey, '10:00');
  if (!s || Number.isNaN(s.getTime()) || !e || Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) {
    return { startAt: baseStart, endAt: baseEnd };
  }
  return { startAt: dateKeyWithTime(dateKey, toLocalInputValue(s.toISOString()).slice(11)), endAt: dateKeyWithTime(dateKey, toLocalInputValue(e.toISOString()).slice(11)) };
}

const MAIN_WINDOW_WIDTH = 1250;
const MAIN_WINDOW_HEIGHT = 900;

export default function Main() {
  const { roomId: selectedRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  // Electron: 로그인 후 메인 화면 진입 시 창 넓이 확대 (로그인 화면은 기존 960x700 유지)
  useEffect(() => {
    if (!window.electronAPI?.windowResize) return;
    const resize = () => window.electronAPI!.windowResize(MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT);
    resize();
    const t = setTimeout(resize, 300);
    return () => clearTimeout(t);
  }, []);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const myEmail = user?.email;
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  // --- Layout state ---
  const [activePanel, setActivePanel] = useState<'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'ai' | 'settings'>('none');
  const [sectionOpen, setSectionOpen] = useState<{ topic: boolean; chat: boolean; app: boolean }>({ topic: true, chat: true, app: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupFor, setCreateGroupFor] = useState<'topic' | 'chat'>('topic');
  const recentTopicRoomRef = useRef<{ id: string; at: number } | null>(null);
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; user: OrgUser } | null>(null);
  const [profileModalUser, setProfileModalUser] = useState<OrgUser | null>(null);
  const [roomContextMenu, setRoomContextMenu] = useState<{ x: number; y: number; room: Room } | null>(null);
  const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});
  const [showFolderManageModal, setShowFolderManageModal] = useState(false);
  const [avatarEditFile, setAvatarEditFile] = useState<File | null>(null);
  const [statusInput, setStatusInput] = useState('');
  const [aiMessages, setAiMessages] = useState<OllamaMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const [mutedRoomIds, setMutedRoomIds] = useState<Set<string>>(() => {
    try { const raw = localStorage.getItem('mutedRoomIds'); if (!raw) return new Set(); const list = JSON.parse(raw); return new Set(Array.isArray(list) ? list.map(String) : []); } catch { return new Set(); }
  });
  const [notificationsSnoozedUntil, setNotificationsSnoozedUntil] = useState<number>(() => {
    try { const raw = localStorage.getItem('notificationsSnoozedUntil'); return raw ? Number(raw) : 0; } catch { return 0; }
  });
  const showToast = useToastStore((s) => s.show);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
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

  const notificationStatus = typeof Notification === 'undefined' ? '지원되지 않음' : Notification.permission === 'granted' ? '허용됨' : Notification.permission === 'denied' ? '차단됨' : '미정';
  const requestNotificationPermission = async () => { if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { /* ignore */ } } };

  const hasElectron = !!window.electronAPI;

  // 앱 버전 조회 (Electron 패키징된 앱)
  useEffect(() => {
    if (hasElectron && activePanel === 'settings') {
      window.electronAPI?.getAppVersion?.().then((v) => setAppVersion(v)).catch(() => {});
    }
  }, [hasElectron, activePanel]);

  // 업데이트 다운로드 완료 시 "지금 재시작" 버튼 표시
  useEffect(() => {
    if (!hasElectron || !window.electronAPI?.onUpdateDownloaded) return;
    const unsub = window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('ready'));
    return unsub;
  }, [hasElectron]);

  const handleCheckForUpdates = async () => {
    if (!hasElectron || !window.electronAPI?.checkForUpdates) return;
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const r = await window.electronAPI.checkForUpdates();
      if (!r.success) {
        setUpdateStatus('error');
        setUpdateError(r.error || '업데이트 확인에 실패했습니다.');
        return;
      }
      if (r.hasUpdate && r.version) {
        setUpdateStatus('downloading');
        setUpdateVersion(r.version);
        setAppVersion(r.currentVersion ?? appVersion);
      } else {
        setUpdateStatus('latest');
        setAppVersion(r.currentVersion ?? appVersion);
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError((err as Error)?.message || '업데이트 확인에 실패했습니다.');
    }
  };

  const handleQuitAndInstall = () => {
    window.electronAPI?.quitAndInstall?.();
  };

  useEffect(() => {
    if (token) window.electronAPI?.windowResize?.(960, 700);
  }, [token]);

  // --- Queries ---
  const { data: roomsRaw = [], isError: roomsError } = useQuery({ queryKey: ['rooms', myId], queryFn: roomsApi.list, enabled: !!myId });
  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: foldersApi.list, enabled: !!myId });
  const allRooms = (roomsRaw as Room[]) ?? [];
  const q = searchQuery.trim().toLowerCase();
  const filteredRooms = q ? allRooms.filter((r) => r.name?.toLowerCase().includes(q)) : allRooms;
  const topicRooms = filteredRooms.filter((r) => r.isGroup && r.isTopic);
  const chatRooms = filteredRooms.filter((r) => !r.isGroup || !r.isTopic);

  const toggleFolder = (folderId: string) => setFolderOpen((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  const folderIds = useMemo(() => new Set((folders as Folder[]).map((f) => f.id)), [folders]);
  const roomsByFolder = useMemo(() => {
    const byFolder = new Map<string | null, Room[]>();
    byFolder.set(null, []);
    for (const f of folders as Folder[]) byFolder.set(f.id, []);
    for (const r of topicRooms) {
      const key = r.folderId && folderIds.has(r.folderId) ? r.folderId : null;
      const list = byFolder.get(key)!;
      list.push(r);
    }
    return byFolder;
  }, [topicRooms, folders, folderIds]);

  const topicUnreadCount = useMemo(() => topicRooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0), [topicRooms]);
  const chatUnreadCount = useMemo(() => chatRooms.reduce((sum, r) => sum + (r.unreadCount ?? 0), 0), [chatRooms]);
  const totalUnreadCount = topicUnreadCount + chatUnreadCount;

  const { data: orgTreeRaw = [], isLoading: orgLoading, isError: orgError, refetch: refetchOrg } = useQuery({ queryKey: ['org', 'tree'], queryFn: orgApi.tree });
  const orgTree = useMemo(() => {
    const tree = (orgTreeRaw as OrgCompany[]) ?? [];
    if (activePanel !== 'friends') return tree;
    return tree.map((company) => ({
      ...company,
      departments: (company.departments ?? []).map((dept) => ({
        ...dept,
        users: (dept.users ?? []).filter((u) => {
          const nameMatch = !q || u.name?.toLowerCase().includes(q);
          const onlineMatch = !showOnlineOnly || onlineUserIds.has(String(u.id));
          return nameMatch && onlineMatch;
        }),
      })).filter((dept) => (dept.users?.length ?? 0) > 0),
    })).filter((company) => (company.departments?.length ?? 0) > 0);
  }, [orgTreeRaw, activePanel, q, showOnlineOnly, onlineUserIds]);

  const { data: onlineData } = useQuery({ queryKey: ['org', 'online'], queryFn: orgApi.online, enabled: !!token });
  const { data: announcementData } = useQuery({ queryKey: ['announcement'], queryFn: announcementApi.get, enabled: !!token });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list, enabled: !!token });
  const { data: bookmarks = [] } = useQuery({ queryKey: ['bookmarks'], queryFn: bookmarksApi.list, enabled: !!token && activePanel === 'bookmark' });
  const { data: mentions = [] } = useQuery({ queryKey: ['mentions'], queryFn: mentionsApi.list, enabled: !!token && activePanel === 'mention' });
  const { data: unreadMentionCount } = useQuery({ queryKey: ['mentions', 'unread-count'], queryFn: mentionsApi.unreadCount, enabled: !!token, refetchInterval: 30000 });
  const { data: publicRooms = [] } = useQuery({ queryKey: ['rooms', 'public'], queryFn: roomsApi.listPublic, enabled: !!token && sectionOpen.topic });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    (events as Event[]).forEach((ev) => { const key = toLocalDateKey(ev.startAt); if (key) { const list = map.get(key) || []; list.push(ev); map.set(key, list); } });
    return map;
  }, [events]);

  // --- Effects ---
  useEffect(() => { if (!selectedDate) return; setEventForm((prev) => { const n = normalizeTimeRange(selectedDate, prev.startAt, prev.endAt); return { ...prev, startAt: n.startAt, endAt: n.endAt }; }); }, [selectedDate]);
  useEffect(() => { if (onlineData?.userIds) setOnlineUserIds(new Set(onlineData.userIds.map((id) => String(id)))); }, [onlineData?.userIds]);
  useEffect(() => { if (announcementData?.content?.trim()) setShowAnnouncementModal(true); }, [announcementData?.content]);
  useEffect(() => { if (announcementData?.content !== undefined) setAnnouncementEdit(announcementData.content ?? ''); }, [announcementData?.content]);
  useEffect(() => { aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages, aiLoading]);
  useEffect(() => { if (!contextMenu) return; const close = () => setContextMenu(null); const t = setTimeout(() => document.addEventListener('click', close), 100); return () => { clearTimeout(t); document.removeEventListener('click', close); }; }, [contextMenu]);
  useEffect(() => { if (!roomContextMenu) return; const close = () => setRoomContextMenu(null); const t = setTimeout(() => document.addEventListener('click', close), 100); return () => { clearTimeout(t); document.removeEventListener('click', close); }; }, [roomContextMenu]);
  useEffect(() => { if (statusSyncedRef.current || !myId) return; for (const company of (Array.isArray(orgTreeRaw) ? orgTreeRaw : [])) { for (const dept of (company.departments ?? [])) { const me = (dept.users ?? []).find((u) => String(u.id) === String(myId)); if (me) { setStatusInput(me.statusMessage || ''); statusSyncedRef.current = true; return; } } } }, [orgTreeRaw, myId]);

  // 앱 아이콘 배지 (맥 도크/윈도우 태스크바) - 카톡처럼 N 표시
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const hasUnread = !!(token && totalUnreadCount > 0);
    if (api.platform === 'darwin' && api.setBadgeCount) {
      api.setBadgeCount(hasUnread ? 1 : 0).catch(() => {});
    } else if (api.platform === 'win32' && api.setOverlayIcon) {
      import('../utils/badgeOverlay').then(({ generateBadgeOverlayIcon }) => {
        const dataUrl = hasUnread ? generateBadgeOverlayIcon('N') : null;
        api.setOverlayIcon!(dataUrl).catch(() => {});
      });
    } else if (api.setBadgeCount) {
      api.setBadgeCount(hasUnread ? 1 : 0).catch(() => {});
    }
  }, [token, totalUnreadCount]);

  // Socket
  useEffect(() => {
    if (!token) return;
    if (socketRef.current?.connected) return;
    const url = getSocketUrl();
    const s = io(url, { path: '/socket.io', auth: { token } });
    socketRef.current = s;
    s.on('connect_error', (err: { message?: string }) => {
      if (err?.message?.includes('invalid token')) {
        try { localStorage.setItem('forcedLogoutMessage', '다른 기기에서 로그인되어 로그아웃되었습니다.'); localStorage.removeItem('token'); if (typeof window !== 'undefined') navigateToLogin(); } catch { /* ignore */ }
      }
    });
    s.on('connect', () => { setSocketConnected(true); if (myIdRef.current) setOnlineUserIds((prev) => new Set([...prev, String(myIdRef.current)])); });
    s.on('disconnect', () => { setSocketConnected(false); });
    s.on('message', (msg: Message) => {
      const withReadCount = { ...msg, readCount: msg.readCount ?? 0 };
      queryClient.setQueryData<InfiniteData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>>(['rooms', msg.roomId, 'messages'], (old) => {
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
        } catch { /* ignore */ }
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
              } catch { /* ignore */ }
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
              } catch { /* ignore */ }
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
      queryClient.setQueryData<InfiniteData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>>(['rooms', payload.roomId, 'messages'], (old) => {
        if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
        return { ...old, pages: old.pages.map((p) => ({ ...p, messages: (p.messages ?? []).map((m) => m.senderId === myIdRef.current ? { ...m, readCount: Math.max(m.readCount ?? 0, 1) } : m) })) };
      });
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
    });
    s.on('room_avatar_updated', () => {
      const uid = myIdRef.current;
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
    });
    s.on('members_added', () => {
      const uid = myIdRef.current;
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
    });
    s.on('online_list', (payload: { userIds?: string[] }) => { setOnlineUserIds(new Set((payload.userIds || []).map((id) => String(id)))); });
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
    s.on('user_offline', (payload: { userId?: string }) => { if (payload.userId) setOnlineUserIds((prev) => { const next = new Set(prev); next.delete(String(payload.userId)); return next; }); });
    s.on('connect', () => { s.emit('get_online_list'); });
    s.on('user_status_changed', () => { queryClient.invalidateQueries({ queryKey: ['org'] }); });
    s.on('member_left', () => { queryClient.refetchQueries({ queryKey: ['rooms'] }); });
    setSocket(s);
    return () => { s.removeAllListeners(); s.disconnect(); socketRef.current = null; setSocket(null); setSocketConnected(false); };
  }, [token, queryClient]);

  useEffect(() => { if (!socket || !socketConnected || !allRooms.length) return; allRooms.forEach((r) => socket.emit('join_room', r.id)); }, [socket, socketConnected, allRooms]);

  // Snooze timer
  useEffect(() => {
    if (!notificationsSnoozedUntil) return;
    const remaining = notificationsSnoozedUntil - Date.now();
    if (remaining <= 0) return;
    const t = setTimeout(() => {
      setNotificationsSnoozedUntil(0);
      try { localStorage.removeItem('notificationsSnoozedUntil'); } catch { /* ignore */ }
      showToast('알림 일시 중지가 해제되었습니다', 'info');
      try {
        const title = 'EMAX'; const body = '알림 일시 중지가 해제되었습니다';
        if (window.electronAPI?.showNotification) {
          window.electronAPI.showNotification(title, body);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification(title, { body }); }
      } catch { /* ignore */ }
    }, remaining);
    return () => clearTimeout(t);
  }, [notificationsSnoozedUntil, showToast]);

  // 알림 클릭 시 해당 채팅방으로 이동
  useEffect(() => {
    if (!window.electronAPI?.onNavigateToRoom) return;
    const unsubscribe = window.electronAPI.onNavigateToRoom((roomId: string) => {
      setActivePanel('none');
      navigate(`/room/${roomId}`);
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [navigate]);

  // --- Handlers ---
  const toggleSection = (key: 'topic' | 'chat' | 'app') => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleTree = (key: string) => setTreeOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleToggleFavorite = async (room: Room) => { try { await roomsApi.toggleFavorite(room.id, !room.isFavorite); queryClient.invalidateQueries({ queryKey: ['rooms'] }); } catch (err) { console.error(err); } setRoomContextMenu(null); };
  const handleToggleMuteRoom = (roomId: string) => { setMutedRoomIds((prev) => { const next = new Set(prev); if (next.has(roomId)) next.delete(roomId); else next.add(roomId); try { localStorage.setItem('mutedRoomIds', JSON.stringify(Array.from(next))); } catch { /* ignore */ } return next; }); setRoomContextMenu(null); };
  const snoozeNotifications = (minutes: number) => { const until = Date.now() + minutes * 60 * 1000; setNotificationsSnoozedUntil(until); try { localStorage.setItem('notificationsSnoozedUntil', String(until)); } catch { /* ignore */ } };
  const clearSnooze = () => { setNotificationsSnoozedUntil(0); try { localStorage.removeItem('notificationsSnoozedUntil'); } catch { /* ignore */ } };
  const handleLeaveRoom = async (roomId: string) => { if (!confirm('채팅방을 나가시겠습니까?')) { setRoomContextMenu(null); return; } try { await roomsApi.leave(roomId); queryClient.invalidateQueries({ queryKey: ['rooms'] }); } catch (err) { console.error(err); } setRoomContextMenu(null); };
  const handleSetStatus = async (msg: string) => { try { await usersApi.updateStatus(msg); setStatusInput(msg); queryClient.invalidateQueries({ queryKey: ['org'] }); } catch (err) { console.error(err); } };

  // --- Room item renderer ---
  const renderRoomItem = (r: Room) => (
    <li
      key={r.id}
      role="button"
      tabIndex={0}
      onClick={() => { setActivePanel('none'); navigate(`/room/${r.id}`, r.viewMode ? { state: { viewMode: r.viewMode } } : undefined); }}
      onKeyDown={(e) => e.key === 'Enter' && (setActivePanel('none'), navigate(`/room/${r.id}`, r.viewMode ? { state: { viewMode: r.viewMode } } : undefined))}
      onContextMenu={(e) => { e.preventDefault(); setRoomContextMenu({ x: e.clientX, y: e.clientY, room: r }); }}
      style={st.roomItem}
    >
      {r.isFavorite && (
        <span style={st.roomFavoriteIcon} aria-label="즐겨찾기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      )}
      <div style={st.roomAvatar} aria-hidden>
        {r.isGroup && !r.isTopic && Array.isArray(r.members) && r.members.length > 0 ? (
          <GroupAvatar
            members={r.members.map((m) => ({
              id: m.id ?? (m as { user?: { id: string } }).user?.id ?? '',
              name: m.name ?? (m as { user?: { name: string } }).user?.name,
              avatarUrl: (m as { avatarUrl?: string }).avatarUrl,
            }))}
            myId={myId}
            size={32}
          />
        ) : !r.isGroup && Array.isArray(r.members) && r.members.length > 0 ? (
          (() => {
            const members = r.members as { id?: string; userId?: string; user?: { id: string; name: string; email: string }; name?: string; avatarUrl?: string }[];
            const other = members.find((m) => (m.id ?? m.user?.id) !== myId) ?? members[0];
            const otherId = other?.id ?? (other as { user?: { id: string } })?.user?.id;
            const otherName = other?.name ?? (other as { user?: { name: string } })?.user?.name;
            const hasUserAvatar = !!((other as { avatarUrl?: string })?.avatarUrl);
            return hasUserAvatar ? (
              <UserAvatar
                userId={otherId || ''}
                name={otherName || r.name || ''}
                avatarUrlPath={(other as { avatarUrl?: string }).avatarUrl}
                imgStyle={st.roomAvatarImg}
                initialStyle={st.roomAvatarInitial}
              />
            ) : (
              <RoomAvatar
                roomId={r.id}
                name={r.name || otherName || ''}
                initials={null}
                hasAvatar={false}
                avatarUrlPath={null}
                imgStyle={st.roomAvatarImg}
                initialStyle={st.roomAvatarInitial}
              />
            );
          })()
        ) : (
          <RoomAvatar
            roomId={r.id}
            name={r.name || ''}
            initials={r.initials}
            hasAvatar={!!r.avatarUrl}
            avatarUrlPath={r.avatarUrl}
            imgStyle={st.roomAvatarImg}
            initialStyle={st.roomAvatarInitial}
          />
        )}
      </div>
      <div style={st.roomInfo}>
        <div style={st.roomName}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 0', minWidth: 0 }}>{r.name}</span>
          {r.isGroup && r.isTopic && r.viewMode && (
            <span style={st.roomViewModeBadge} title={r.viewMode === 'board' ? '보드뷰: 게시글 기반' : '챗뷰: 메시지 기반'}>
              {r.viewMode === 'board' ? '보드뷰' : '챗뷰'}
            </span>
          )}
        </div>
        <div style={st.roomPreview}>{r.lastMessage ? r.lastMessage.content : ''}</div>
      </div>
      <div style={st.roomMeta}>
        {r.lastMessage && <span style={st.roomTime}>{new Date(r.lastMessage.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>}
        {mutedRoomIds.has(r.id) && <span style={st.roomMuted} title="알림 꺼짐">음소거</span>}
        {(r.unreadCount ?? 0) > 0 && <span style={st.roomUnreadBadge}>{r.unreadCount! > 99 ? '99+' : r.unreadCount}</span>}
      </div>
    </li>
  );

  return (
    <div style={st.appWrap}>
      {hasElectron && <TitleBar title="EMAX" isDark={isDark} />}
      <div style={st.layout}>
        {/* ===== LEFT SIDEBAR ===== */}
        <div style={st.sidebar}>
          {/* Sidebar Header */}
          <div style={st.sidebarHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={st.logoBox}>
                <img
                  src={`${import.meta.env.BASE_URL}emax-logo.png?v=5`}
                  alt="EMAX"
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: 'contain',
                    display: 'block',
                    background: 'transparent',
                  }}
                />
              </div>
              <span style={st.brandName}>EMAX</span>
            </div>
          </div>

          {/* Profile */}
          <div style={st.profileSection}>
            <div style={{ position: 'relative' as const, flexShrink: 0 }}>
              <div style={st.profileAvatar}>
                {user?.avatarUrl ? (
                  <UserAvatar userId={user.id} name={user.name || ''} avatarUrlPath={user.avatarUrl} imgStyle={st.profileAvatarImg} initialStyle={st.profileInitial} />
                ) : (
                  <span style={st.profileInitial}>{user?.name?.trim()[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
              {statusInput && STATUS_OPTIONS.find(o => o.id === statusInput) && (
                <span style={{ position: 'absolute' as const, top: -2, right: -2, display: 'block', borderRadius: '50%', border: `1.5px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, lineHeight: 0 }}>
                  <StatusIcon status={statusInput} size={13} />
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={st.profileName}>{user?.name || '사용자'}</div>
              {statusInput && <div style={st.profileStatus}>{STATUS_OPTIONS.find(o => o.id === statusInput)?.label || statusInput}</div>}
            </div>
          </div>

          {/* Search */}
          <div style={st.searchWrap}>
            <input
              type="text"
              placeholder="대화방 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={st.searchInput}
            />
            {searchQuery.trim().length > 0 && (
              <UICloseButton
                size="sm"
                variant="subtle"
                onClick={() => setSearchQuery('')}
                style={st.searchClearBtn}
                aria-label="검색어 지우기"
                title="검색어 지우기"
              />
            )}
          </div>

          {/* Scrollable sections */}
          <div style={st.sidebarContent}>
            {/* TOPIC Section - JANDI 스타일 폴더 구조 */}
            <div>
              <button type="button" style={st.sectionHeader} onClick={() => toggleSection('topic')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={st.sectionChevron}><UIChevron open={sectionOpen.topic} size={11} color={isDark ? '#94a3b8' : '#64748b'} /></span>
                  <span style={st.sectionTitle}>아젠다</span>
                  <span style={st.sectionCount}>{topicRooms.length}개</span>
                  {topicUnreadCount > 0 && <span style={st.sectionUnreadBadge}>{topicUnreadCount > 99 ? '99+' : topicUnreadCount}</span>}
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <span
                    style={st.sectionTextBtn}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setShowFolderManageModal(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowFolderManageModal(true); } }}
                    title="폴더 관리"
                  >폴더</span>
                  <span
                    style={st.sectionAddBtn}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setCreateGroupFor('topic'); setShowCreateGroupModal(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setCreateGroupFor('topic'); setShowCreateGroupModal(true); } }}
                    title="아젠다 만들기"
                  ><PlusIcon /></span>
                </span>
              </button>
              {sectionOpen.topic && (
                <>
                  {roomsError ? (
                    <div style={{ padding: '8px 16px', fontSize: 12, color: '#c62828' }}>목록을 불러올 수 없습니다</div>
                  ) : topicRooms.length === 0 && ((folders as Folder[])?.length ?? 0) === 0 ? (
                    <div style={{ padding: '8px 16px', fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>아젠다가 없습니다</div>
                  ) : (
                    <div style={{ paddingLeft: 4 }}>
                      {((folders as Folder[]) ?? []).map((f) => {
                        const rooms = roomsByFolder.get(f.id) ?? [];
                        const isOpen = folderOpen[f.id] !== false;
                        const folderUnread = rooms.reduce((s, r) => s + (r.unreadCount ?? 0), 0);
                        return (
                          <div key={f.id}>
                            <button
                              type="button"
                              style={st.folderHeader}
                              onClick={() => toggleFolder(f.id)}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UIChevron open={isOpen} size={10} color={isDark ? '#94a3b8' : '#64748b'} />
                              </span>
                              <span>{f.name}</span>
                              <span style={{ fontSize: 11, opacity: 0.8 }}>({rooms.length})</span>
                              {folderUnread > 0 && <span style={st.sectionUnreadBadge}>{folderUnread > 99 ? '99+' : folderUnread}</span>}
                            </button>
                            {isOpen && <ul style={st.roomList}>{rooms.map(renderRoomItem)}</ul>}
                          </div>
                        );
                      })}
                      {(roomsByFolder.get(null) ?? []).length > 0 && (
                        <div>
                          <div style={{ padding: '6px 12px', fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>미분류</div>
                          <ul style={st.roomList}>{(roomsByFolder.get(null) ?? []).map(renderRoomItem)}</ul>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Public rooms in topic section */}
                  {(Array.isArray(publicRooms) ? publicRooms : []).filter((pr: PublicRoom) => !allRooms.some((r) => r.id === pr.id)).length > 0 && (
                    <div style={{ padding: '4px 16px 8px' }}>
                      <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginBottom: 4 }}>공개 채널</div>
                      {(Array.isArray(publicRooms) ? publicRooms : []).filter((pr: PublicRoom) => !allRooms.some((r) => r.id === pr.id)).map((pr) => (
                        <div key={pr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                          <span style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{pr.name}</span>
                          <button
                            type="button"
                            style={{ border: 'none', background: isDark ? '#475569' : '#e5e7eb', color: isDark ? '#e2e8f0' : '#333', fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                            onClick={async () => { try { await roomsApi.join(pr.id); queryClient.invalidateQueries({ queryKey: ['rooms'] }); queryClient.invalidateQueries({ queryKey: ['rooms', 'public'] }); setActivePanel('none'); navigate(`/room/${pr.id}`); } catch (err) { console.error(err); } }}
                          >참가</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CHAT Section */}
            <div style={{ borderTop: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`, marginTop: 4 }}>
              <button type="button" style={st.sectionHeader} onClick={() => toggleSection('chat')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={st.sectionChevron}><UIChevron open={sectionOpen.chat} size={11} color={isDark ? '#94a3b8' : '#64748b'} /></span>
                  <span style={st.sectionTitle}>채팅</span>
                  <span style={st.sectionCount}>{chatRooms.length}개</span>
                  {chatUnreadCount > 0 && <span style={st.sectionUnreadBadge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}
                </span>
                <span
                  style={st.sectionAddBtn}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setCreateGroupFor('chat'); setShowCreateGroupModal(true); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setCreateGroupFor('chat'); setShowCreateGroupModal(true); } }}
                  title="1:1 채팅 만들기"
                ><PlusIcon /></span>
              </button>
              {sectionOpen.chat && (
                chatRooms.length === 0 ? (
                  <div style={{ padding: '8px 16px', fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>채팅이 없습니다</div>
                ) : (
                  <ul style={st.roomList}>{chatRooms.map(renderRoomItem)}</ul>
                )
              )}
            </div>

            {/* APP Section */}
            <div>
              <button type="button" style={st.sectionHeader} onClick={() => toggleSection('app')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={st.sectionChevron}><UIChevron open={sectionOpen.app} size={11} color={isDark ? '#94a3b8' : '#64748b'} /></span>
                  <span style={st.sectionTitle}>앱</span>
                </span>
              </button>
              {sectionOpen.app && (
                <div style={{ padding: '4px 8px' }}>
                  <button
                    type="button"
                    style={{ ...st.appItem, ...(activePanel === 'schedule' ? st.appItemActive : {}) }}
                    onClick={() => setActivePanel(activePanel === 'schedule' ? 'none' : 'schedule')}
                  >
                    <span>캘린더</span>
                  </button>
                  <button
                    type="button"
                    style={{ ...st.appItem, ...(activePanel === 'ai' ? st.appItemActive : {}) }}
                    onClick={() => setActivePanel(activePanel === 'ai' ? 'none' : 'ai')}
                  >
                    <span>AI 채팅</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT SIDE ===== */}
        <div style={st.rightSide}>
          {/* Top Menu Bar */}
          <div style={st.menuBar}>
            <div style={st.menuBarLeft} />
            <div style={st.menuBarRight}>
              {/* Mention */}
              <button
                type="button"
                style={{ ...st.menuBtn, ...(activePanel === 'mention' ? st.menuBtnActive : {}), position: 'relative' as const }}
                onClick={() => setActivePanel(activePanel === 'mention' ? 'none' : 'mention')}
                title="멘션"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
                </svg>
                {(unreadMentionCount?.count ?? 0) > 0 && (
                  <span style={st.menuBadge}>{unreadMentionCount!.count > 9 ? '9+' : unreadMentionCount!.count}</span>
                )}
              </button>
              {/* Bookmark */}
              <button type="button" style={{ ...st.menuBtn, ...(activePanel === 'bookmark' ? st.menuBtnActive : {}) }} onClick={() => setActivePanel(activePanel === 'bookmark' ? 'none' : 'bookmark')} title="북마크">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </button>
              {/* Friends */}
              <button type="button" style={{ ...st.menuBtn, ...(activePanel === 'friends' ? st.menuBtnActive : {}) }} onClick={() => setActivePanel(activePanel === 'friends' ? 'none' : 'friends')} title="멤버">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
              {/* Schedule */}
              <button type="button" style={{ ...st.menuBtn, ...(activePanel === 'schedule' ? st.menuBtnActive : {}) }} onClick={() => setActivePanel(activePanel === 'schedule' ? 'none' : 'schedule')} title="일정">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
              {/* AI Chat */}
              <button type="button" style={{ ...st.menuBtn, ...(activePanel === 'ai' ? st.menuBtnActive : {}) }} onClick={() => setActivePanel(activePanel === 'ai' ? 'none' : 'ai')} title="AI 채팅">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                </svg>
              </button>
              {/* Settings */}
              <button type="button" style={{ ...st.menuBtn, ...(activePanel === 'settings' ? st.menuBtnActive : {}), position: 'relative' as const }} onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')} title="설정">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
                </svg>
                {notificationsSnoozedUntil > Date.now() && <span style={{ position: 'absolute' as const, top: 4, right: 4, width: 6, height: 6, borderRadius: 999, background: '#f59e0b' }} />}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div style={st.contentArea}>
            {selectedRoomId && activePanel === 'none' ? (
              <ChatWindow key={selectedRoomId} embedded onOpenInNewWindow={() => { openChatWindow(selectedRoomId); navigate('/'); }} />
            ) : (
              <>
                {activePanel === 'none' && (
                  <div style={st.emptyState}>
                    <div style={st.emptyIcon}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <p style={st.emptyText}>채팅방을 선택하세요</p>
                    <p style={st.emptyHint}>왼쪽 아젠다 또는 채팅에서 대화를 시작하세요</p>
                  </div>
                )}

            {/* MENTION PANEL */}
            {activePanel === 'mention' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}><h3 style={st.panelTitle}>멘션</h3></div>
                <div style={st.panelBody}>
                  {(Array.isArray(mentions) ? mentions : []).length === 0 ? (
                    <div style={st.panelEmpty}>대화에서 @멘션 되면 여기에 표시됩니다</div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {(Array.isArray(mentions) ? mentions : []).map((m) => (
                        <li
                          key={m.id}
                          style={{ ...st.panelItem, background: !m.readAt ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)') : 'transparent' }}
                          role="button" tabIndex={0}
                          onClick={async () => {
                            if (!m.readAt) { try { await mentionsApi.markRead(m.id); queryClient.invalidateQueries({ queryKey: ['mentions'] }); queryClient.invalidateQueries({ queryKey: ['mentions', 'unread-count'] }); } catch (err) { console.error(err); } }
                            if (m.message?.room?.id) { setActivePanel('none'); navigate(`/room/${m.message.room.id}`); }
                          }}
                        >
                          {!m.readAt && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#171717', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>{m.message?.sender?.name || '알 수 없음'}</span>
                              <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{m.message?.room?.name || ''}</span>
                            </div>
                            <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message?.content || ''}</div>
                            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginTop: 2 }}>{m.message?.createdAt ? new Date(m.message.createdAt).toLocaleString('ko-KR') : ''}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* BOOKMARK PANEL */}
            {activePanel === 'bookmark' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}><h3 style={st.panelTitle}>북마크</h3></div>
                <div style={st.panelBody}>
                  {(Array.isArray(bookmarks) ? bookmarks : []).length === 0 ? (
                    <div style={st.panelEmpty}>채팅에서 메시지를 북마크하세요</div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {(Array.isArray(bookmarks) ? bookmarks : []).map((b) => (
                        <li
                          key={b.id} style={st.panelItem} role="button" tabIndex={0}
                          onClick={() => b.message?.room?.id && (setActivePanel('none'), navigate(`/room/${b.message.room.id}`))}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>{b.message?.sender?.name || '알 수 없음'}</span>
                              <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{b.message?.room?.name || ''}</span>
                            </div>
                            <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {b.message?.fileUrl ? `[파일] ${b.message.fileName || '파일'}` : (b.message?.content || '')}
                            </div>
                            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginTop: 2 }}>{b.message?.createdAt ? new Date(b.message.createdAt).toLocaleString('ko-KR') : ''}</div>
                          </div>
                          <UICloseButton
                            size="sm"
                            title="북마크 해제"
                            aria-label="북마크 해제"
                            style={{ color: isDark ? '#64748b' : '#9ca3af' }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await bookmarksApi.remove(b.messageId);
                                queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* FRIENDS PANEL */}
            {activePanel === 'friends' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}>
                  <h3 style={st.panelTitle}>멤버</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="text" placeholder="이름 검색" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '5px 10px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 6, fontSize: 12, background: isDark ? '#334155' : '#f5f5f5', color: isDark ? '#e2e8f0' : '#333', outline: 'none', width: 140 }} />
                    <button type="button" role="switch" aria-checked={showOnlineOnly} onClick={() => setShowOnlineOnly((v) => !v)} style={{ ...st.onlineFilterBtn, ...(showOnlineOnly ? st.onlineFilterBtnActive : {}) }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.7 }} />온라인만
                    </button>
                  </div>
                </div>
                <div style={st.panelBody}>
                  {orgLoading ? (<p style={{ color: isDark ? '#94a3b8' : '#888', fontSize: 13, padding: 16 }}>로딩 중...</p>) : orgError ? (
                    <div style={{ padding: 20, textAlign: 'center' as const }}>
                      <p style={{ color: '#c62828', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>조직 데이터를 불러올 수 없습니다</p>
                      <button type="button" onClick={() => refetchOrg()} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>다시 시도</button>
                    </div>
                  ) : orgTree.length === 0 ? (<p style={{ color: isDark ? '#94a3b8' : '#888', fontSize: 13, padding: 16 }}>표시할 조직이 없습니다.</p>) : (
                    <div style={{ padding: '8px 12px' }}>
                      {orgTree.map((company: OrgCompany) => {
                        const companyKey = `company-${company.id}`;
                        const companyOpen = treeOpen[companyKey] !== false;
                        return (
                          <div key={company.id} style={{ marginBottom: 6 }}>
                            <button type="button" style={st.treeNode} onClick={() => toggleTree(companyKey)}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <UIChevron open={companyOpen} size={9} color={isDark ? '#64748b' : '#9ca3af'} />
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#f1f5f9' : '#111827' }}>{company.name}</span>
                            </button>
                            {companyOpen && company.departments.map((dept) => {
                              const deptKey = `dept-${dept.id}`;
                              const deptOpen = treeOpen[deptKey] !== false;
                              return (
                                <div key={dept.id} style={{ marginLeft: 14, marginTop: 2 }}>
                                  <button type="button" style={st.treeNode} onClick={() => toggleTree(deptKey)}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      <UIChevron open={deptOpen} size={9} color={isDark ? '#64748b' : '#9ca3af'} />
                                    </span>
                                    <span style={{ fontWeight: 500, fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>{dept.name}</span>
                                  </button>
                                  {deptOpen && (
                                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: 2 }}>
                                      {dept.users.map((u) => {
                                        const isOnline = onlineUserIds.has(String(u.id)) || (String(u.id) === String(myId) && !!socket?.connected);
                                        return (
                                          <li key={u.id} style={{ marginBottom: 1 }}>
                                            <button
                                              type="button"
                                              style={{ ...st.treeUserBtn, ...(!isOnline ? { opacity: 0.7, color: isDark ? '#64748b' : '#9ca3af' } : {}) }}
                                              onClick={async () => { try { const room = await roomsApi.create(u.id); queryClient.invalidateQueries({ queryKey: ['rooms'] }); setActivePanel('none'); navigate(`/room/${room.id}`); } catch (err) { console.error(err); } }}
                                              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, user: u }); }}
                                            >
                                              <div style={{ position: 'relative' as const, width: 28, height: 28, flexShrink: 0 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: isDark ? '#475569' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden' }}>
                                                  <UserAvatar userId={u.id} name={u.name} avatarUrlPath={u.avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} initialStyle={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280' }} />
                                                </div>
                                                {u.statusMessage && STATUS_OPTIONS.find(o => o.id === u.statusMessage) ? (
                                                  <span style={{ position: 'absolute' as const, top: -2, right: -2, display: 'block', borderRadius: '50%', border: `1.5px solid ${isDark ? '#1e293b' : '#fff'}`, lineHeight: 0 }}>
                                                    <StatusIcon status={u.statusMessage} size={11} />
                                                  </span>
                                                ) : isOnline ? (
                                                  <span style={{ position: 'absolute' as const, top: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: `1.5px solid ${isDark ? '#1e293b' : '#fff'}`, display: 'block' }} title="온라인" />
                                                ) : null}
                                              </div>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <span style={{ color: isDark ? '#cbd5e1' : '#374151', fontWeight: 500, fontSize: 13 }}>{u.name}</span>
                                                {u.statusMessage && <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.statusMessage}</div>}
                                              </div>
                                              {(String(u.id) === String(myId) || u.email === myEmail) && <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>(나)</span>}
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
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCHEDULE PANEL */}
            {activePanel === 'schedule' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}><h3 style={st.panelTitle}>일정</h3></div>
                <div style={{ ...st.panelBody, padding: 24 }}>
                  {/* Calendar */}
                  <div style={{ border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 12, padding: 12, background: isDark ? '#1e293b' : '#fff', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <button type="button" style={{ border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }} onClick={() => setCalendarMonth((m) => addMonths(m, -1))}>◀</button>
                      <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827' }}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</div>
                      <button type="button" style={{ border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }} onClick={() => setCalendarMonth((m) => addMonths(m, 1))}>▶</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {['일', '월', '화', '수', '목', '금', '토'].map((d) => (<div key={d} style={{ textAlign: 'center' as const, fontSize: 11, color: isDark ? '#64748b' : '#888', padding: '3px 0' }}>{d}</div>))}
                      {(() => {
                        const start = startOfMonth(calendarMonth);
                        const firstDow = start.getDay();
                        const totalDays = daysInMonth(calendarMonth);
                        const cells = [];
                        for (let i = 0; i < firstDow; i++) cells.push(<div key={`e-${i}`} style={{ height: 36 }} />);
                        for (let day = 1; day <= totalDays; day++) {
                          const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const list = eventsByDate.get(key) || [];
                          const isSelected = key === selectedDate;
                          const isToday = key === toLocalDateKey(new Date().toISOString());
                          cells.push(
                            <button type="button" key={key} onClick={() => setSelectedDate(key)} style={{
                              height: 36, borderRadius: 8, border: `1px solid ${isDark ? '#334155' : '#eef2f7'}`,
                              background: isSelected ? '#475569' : (isDark ? '#1e293b' : '#f8fafc'),
                              color: isSelected ? '#fff' : (isDark ? '#e2e8f0' : '#333'),
                              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 1, cursor: 'pointer', fontSize: 12,
                              ...(isToday ? { boxShadow: 'inset 0 0 0 2px #94a3b8' } : {}),
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{day}</span>
                              {list.length > 0 && <span style={{ fontSize: 8, fontWeight: 700, background: isDark ? '#171717' : '#0f172a', color: '#fff', borderRadius: 8, padding: '0px 3px' }}>{list.length}</span>}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#888' }}>선택: {selectedDate}</span>
                      <button type="button" style={{ border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }} onClick={() => { const key = toLocalDateKey(new Date().toISOString()); if (key) { setSelectedDate(key); setCalendarMonth(startOfMonth(new Date())); } }}>오늘</button>
                    </div>
                  </div>
                  {/* Event form */}
                  <div style={{ marginBottom: 20 }}>
                    <input type="text" placeholder="제목" value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} style={st.formInput} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} style={st.formInput} />
                      <span style={{ color: isDark ? '#94a3b8' : '#888' }}>~</span>
                      <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} style={st.formInput} />
                    </div>
                    <input type="text" placeholder="설명 (선택)" value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} style={st.formInput} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {editingEventId ? (
                        <>
                          <button type="button" style={st.formBtn} onClick={async () => {
                            if (!editingEventId || !eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
                            try { await eventsApi.update(editingEventId, { title: eventForm.title.trim(), startAt: eventForm.startAt, endAt: eventForm.endAt, description: eventForm.description.trim() || undefined }); queryClient.invalidateQueries({ queryKey: ['events'] }); setEditingEventId(null); const n = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt); setEventForm({ title: '', startAt: n.startAt, endAt: n.endAt, description: '' }); } catch (err) { console.error(err); }
                          }}>수정</button>
                          <button type="button" style={st.formBtnCancel} onClick={() => { setEditingEventId(null); setEventForm({ title: '', startAt: '', endAt: '', description: '' }); }}>취소</button>
                        </>
                      ) : (
                        <button type="button" style={st.formBtn} onClick={async () => {
                          if (!eventForm.title.trim() || !eventForm.startAt || !eventForm.endAt) return;
                          try { await eventsApi.create({ title: eventForm.title.trim(), startAt: eventForm.startAt, endAt: eventForm.endAt, description: eventForm.description.trim() || undefined }); queryClient.invalidateQueries({ queryKey: ['events'] }); const n = normalizeTimeRange(selectedDate, eventForm.startAt, eventForm.endAt); setEventForm({ title: '', startAt: n.startAt, endAt: n.endAt, description: '' }); } catch (err) { console.error(err); }
                        }}>추가</button>
                      )}
                    </div>
                  </div>
                  {/* Event list */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827' }}>선택한 날짜 일정</span>
                    <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#888' }}>{(eventsByDate.get(selectedDate) || []).length}건</span>
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {((eventsByDate.get(selectedDate) || []) as Event[]).map((ev) => (
                      <li key={ev.id} style={{ padding: 12, borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333', marginBottom: 4 }}>{ev.title}</strong>
                          <span style={{ display: 'block', fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginBottom: 4 }}>{new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}</span>
                          {ev.description && <span style={{ display: 'block', fontSize: 13, color: isDark ? '#64748b' : '#666' }}>{ev.description}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button type="button" style={st.formBtn} onClick={() => { setEditingEventId(ev.id); setEventForm({ title: ev.title, startAt: toLocalInputValue(ev.startAt), endAt: toLocalInputValue(ev.endAt), description: ev.description ?? '' }); }}>수정</button>
                          <button type="button" style={{ ...st.formBtnCancel, color: '#c62828' }} onClick={async () => { try { await eventsApi.delete(ev.id); queryClient.invalidateQueries({ queryKey: ['events'] }); } catch (err) { console.error(err); } }}>삭제</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {(eventsByDate.get(selectedDate) || []).length === 0 && <p style={{ color: isDark ? '#94a3b8' : '#888', fontSize: 13 }}>선택한 날짜에 일정이 없습니다.</p>}
                </div>
              </div>
            )}

            {/* AI CHAT PANEL */}
            {activePanel === 'ai' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}>
                  <h3 style={st.panelTitle}>AI 채팅</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{getOllamaConfig().model}</span>
                    {aiMessages.length > 0 && (
                      <button type="button" style={{ padding: '4px 10px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 6, background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', fontSize: 11, cursor: 'pointer' }} onClick={() => setAiMessages([])}>대화 초기화</button>
                    )}
                  </div>
                </div>
                <div style={{ ...st.panelBody, display: 'flex', flexDirection: 'column', padding: 0 }}>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
                    {aiMessages.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 32, color: isDark ? '#64748b' : '#9ca3af', fontSize: 13 }}>
                        <p style={{ margin: '0 0 8px' }}>Ollama와 대화를 시작하세요</p>
                        <p style={{ margin: 0, fontSize: 12 }}>메시지를 입력하고 전송하세요</p>
                      </div>
                    )}
                    {aiMessages.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '10px 14px',
                          marginBottom: 8,
                          borderRadius: 12,
                          maxWidth: '90%',
                          alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                          background: m.role === 'user' ? (isDark ? '#475569' : '#e5e7eb') : (isDark ? '#334155' : '#f1f5f9'),
                          color: isDark ? '#e2e8f0' : '#333',
                          fontSize: 14,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.role === 'user' && <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', display: 'block', marginBottom: 4 }}>나</span>}
                        {m.role === 'assistant' && <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', display: 'block', marginBottom: 4 }}>AI</span>}
                        {m.content}
                      </div>
                    ))}
                    {aiLoading && (
                      <div style={{ padding: '10px 14px', marginBottom: 8, borderRadius: 12, maxWidth: '90%', alignSelf: 'flex-start', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                        <span style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>AI</span>
                        <span>생각 중...</span>
                      </div>
                    )}
                    <div ref={aiMessagesEndRef} />
                  </div>
                  <div style={{ flexShrink: 0, padding: 12, borderTop: `1px solid ${isDark ? '#334155' : '#e5e7eb'}` }}>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const text = aiInput.trim();
                        if (!text || aiLoading) return;
                        setAiInput('');
                        const userMsg: OllamaMessage = { role: 'user', content: text };
                        setAiMessages((prev) => [...prev, userMsg]);
                        setAiLoading(true);
                        try {
                          const reply = await ollamaChat([...aiMessages, userMsg]);
                          setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
                        } catch (err) {
                          setAiMessages((prev) => [...prev, { role: 'assistant', content: `오류: ${(err as Error).message}` }]);
                        } finally {
                          setAiLoading(false);
                          aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}
                    >
                      <textarea
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).form?.requestSubmit(); } }}
                        placeholder="메시지 입력..."
                        rows={2}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
                          borderRadius: 10,
                          fontSize: 14,
                          background: isDark ? '#1e293b' : '#fff',
                          color: isDark ? '#e2e8f0' : '#333',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                      <button type="submit" disabled={aiLoading || !aiInput.trim()} style={{ ...st.formBtn, alignSelf: 'flex-end', padding: '10px 16px' }}>
                        {aiLoading ? '대기...' : '전송'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS PANEL */}
            {activePanel === 'settings' && (
              <div style={st.panelWrap}>
                <div style={st.panelHeader}><h3 style={st.panelTitle}>설정</h3></div>
                <div style={{ ...st.panelBody, padding: 24, display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  {/* 프로필 영역 - 상단 배치, 크게 표시 */}
                  <div style={{ padding: '20px 16px', borderRadius: 12, background: isDark ? '#334155' : '#f0f4ff', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 96, height: 96, borderRadius: 16, background: isDark ? '#475569' : '#e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {user?.avatarUrl ? <UserAvatar userId={user.id} name={user.name || ''} avatarUrlPath={user.avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} initialStyle={{ fontSize: 36, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' }} /> : <span style={{ fontSize: 36, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' }}>{user?.name?.trim()[0]?.toUpperCase() || '?'}</span>}
                    </div>
                    <div style={{ textAlign: 'center' as const }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: 4 }}>{user?.name || '사용자'}</div>
                      <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>{user?.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                      <label style={{ padding: '10px 18px', borderRadius: 10, background: isDark ? '#475569' : '#171717', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        사진 변경
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarEditFile(f); e.target.value = ''; }} />
                      </label>
                      {user?.avatarUrl && (
                        <button type="button" onClick={async () => { try { await usersApi.deleteAvatar(); const { user: u } = await authApi.me(); if (u) useAuthStore.getState().setAuth(u, useAuthStore.getState().token); queryClient.invalidateQueries({ queryKey: ['rooms'] }); queryClient.invalidateQueries({ queryKey: ['org'] }); } catch (err) { console.error(err); alert('프로필 사진 삭제에 실패했습니다.'); } }} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${isDark ? '#64748b' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, cursor: 'pointer' }}>
                          사진 삭제
                        </button>
                      )}
                    </div>
                  </div>
                  {notificationsSnoozedUntil > Date.now() && <div style={{ padding: '6px 10px', borderRadius: 999, background: isDark ? '#171717' : '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>알림 일시 중지 중</div>}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>알림 일시 중지</div>
                    {notificationsSnoozedUntil > Date.now() ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: isDark ? '#64748b' : '#666' }}>
                        <span>해제: {new Date(notificationsSnoozedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <button type="button" style={st.formBtn} onClick={clearSnooze}>해제</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={st.formBtn} onClick={() => snoozeNotifications(10)}>10분</button>
                        <button type="button" style={st.formBtn} onClick={() => snoozeNotifications(60)}>1시간</button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#e2e8f0' : '#333' }}>다크 모드</span>
                    <button type="button" onClick={toggleDark} style={{ width: 48, height: 28, borderRadius: 14, border: 'none', background: isDark ? '#171717' : '#e5e7eb', cursor: 'pointer', position: 'relative' as const, padding: 0, flexShrink: 0 }}>
                      <span style={{ position: 'absolute' as const, top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </button>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>업데이트</h4>
                    {hasElectron ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
                        <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666' }}>
                          {appVersion ? `현재 버전 v${appVersion}` : '버전 확인 중...'}
                          {updateStatus === 'downloading' && updateVersion && ` · 새 버전 v${updateVersion} 다운로드 중`}
                          {updateStatus === 'latest' && ' · 최신 버전입니다'}
                          {updateStatus === 'error' && updateError && ` · ${updateError}`}
                        </span>
                        {updateStatus !== 'ready' ? (
                          <button type="button" style={st.formBtn} disabled={updateStatus === 'checking'} onClick={handleCheckForUpdates}>
                            {updateStatus === 'checking' ? '확인 중...' : '업데이트 확인'}
                          </button>
                        ) : (
                          <button type="button" style={{ ...st.formBtn, background: '#16a34a', color: '#fff', fontWeight: 600 }} onClick={handleQuitAndInstall}>
                            지금 재시작하여 업데이트
                          </button>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: isDark ? '#94a3b8' : '#666' }}>업데이트 확인은 데스크톱 앱(.dmg / .exe)에서만 가능합니다.</p>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>상태</h4>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
                      {STATUS_OPTIONS.map((opt) => {
                        const isSelected = statusInput === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSetStatus(opt.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: isSelected ? (isDark ? 'rgba(23,23,23,0.12)' : 'rgba(23,23,23,0.06)') : 'transparent',
                              width: '100%', textAlign: 'left' as const,
                            }}
                          >
                            <span style={{
                              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                              border: `2px solid ${isSelected ? '#171717' : (isDark ? '#64748b' : '#d1d5db')}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#171717', display: 'block' }} />}
                            </span>
                            {opt.id ? <StatusIcon status={opt.id} size={18} /> : <span style={{ width: 18, height: 18, display: 'block' }} />}
                            <span style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', fontWeight: isSelected ? 600 : 400 }}>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', color: isDark ? '#94a3b8' : '#334155', fontSize: 13 }}>알림 상태: {notificationStatus}</div>
                  {user?.isAdmin && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>공지 등록</h4>
                      <textarea value={announcementEdit} onChange={(e) => setAnnouncementEdit(e.target.value)} placeholder="공지 내용을 입력하세요." style={{ width: '100%', padding: 12, border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, lineHeight: 1.5, resize: 'vertical' as const, marginBottom: 10, boxSizing: 'border-box' as const, background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#333' }} rows={3} />
                      <button type="button" style={st.formBtn} disabled={announcementSaving} onClick={async () => { setAnnouncementSaving(true); try { await announcementApi.put(announcementEdit); queryClient.invalidateQueries({ queryKey: ['announcement'] }); } catch (err) { console.error(err); } finally { setAnnouncementSaving(false); } }}>{announcementSaving ? '저장 중...' : '저장'}</button>
                    </div>
                  )}
                  {hasElectron && <button type="button" style={st.settingsBtn} onClick={() => window.electronAPI?.showNotification('EMAX', '알림 테스트입니다.')}>알림 테스트</button>}
                  {!hasElectron && <button type="button" style={st.settingsBtn} onClick={requestNotificationPermission}>알림 권한 요청</button>}
                  <button type="button" style={{ ...st.settingsBtn, color: '#c62828', fontWeight: 600 }} onClick={() => { queryClient.removeQueries({ queryKey: ['rooms'] }); queryClient.removeQueries({ queryKey: ['org'] }); logout(); }}>로그아웃</button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showAnnouncementModal && announcementData?.content?.trim() && (
        <div style={st.overlay} onClick={() => setShowAnnouncementModal(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>공지</h3>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#555', marginBottom: 16 }}>{announcementData.content}</div>
            <button type="button" style={{ ...st.formBtn, width: '100%' }} onClick={() => setShowAnnouncementModal(false)}>확인</button>
          </div>
        </div>
      )}

      {showCreateGroupModal && <CreateGroupModal mode={createGroupFor} onClose={() => setShowCreateGroupModal(false)} onTopicCreated={(id) => { recentTopicRoomRef.current = { id, at: Date.now() }; }} onCreated={(roomId, viewMode, opts) => { if (!opts?.skipRoomsInvalidate) queryClient.invalidateQueries({ queryKey: ['rooms'] }); setActivePanel('none'); navigate(`/room/${roomId}`, viewMode != null ? { state: { viewMode } } : undefined); }} />}

      {avatarEditFile && (
        <AvatarEditModal
          file={avatarEditFile}
          onClose={() => setAvatarEditFile(null)}
          onConfirm={async (croppedFile) => {
            await usersApi.uploadAvatar(croppedFile);
            const { user: u } = await authApi.me();
            if (u) useAuthStore.getState().setAuth(u, useAuthStore.getState().token);
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['org'] });
          }}
        />
      )}

      {showFolderManageModal && <FolderManageModal topicRooms={topicRooms} onClose={() => setShowFolderManageModal(false)} />}

      {contextMenu && (() => {
        const estH = 50;
        const top = contextMenu.y + estH > window.innerHeight - 8 ? contextMenu.y - estH : contextMenu.y;
        const left = Math.min(Math.max(contextMenu.x, 8), window.innerWidth - 130);
        return (
          <div style={{ ...st.ctxMenu, left, top }} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={st.ctxMenuItem} onClick={() => { setProfileModalUser(contextMenu.user); setContextMenu(null); }}>프로필 보기</button>
          </div>
        );
      })()}

      {roomContextMenu && (() => {
        const estH = 180;
        const top = roomContextMenu.y + estH > window.innerHeight - 8 ? roomContextMenu.y - estH : roomContextMenu.y;
        const left = Math.min(Math.max(roomContextMenu.x, 8), window.innerWidth - 210);
        return (
        <div style={{ ...st.ctxMenu, left, top }} onClick={(e) => e.stopPropagation()}>
          <button type="button" style={st.ctxMenuItem} onClick={() => handleToggleFavorite(roomContextMenu.room)}>{roomContextMenu.room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}</button>
          <button type="button" style={st.ctxMenuItem} onClick={() => handleToggleMuteRoom(roomContextMenu.room.id)}>{mutedRoomIds.has(roomContextMenu.room.id) ? '알림 켜기' : '알림 끄기'}</button>
          {roomContextMenu.room.isGroup && roomContextMenu.room.isTopic && (
            <button type="button" style={st.ctxMenuItem} onClick={() => { setShowFolderManageModal(true); setRoomContextMenu(null); }}>폴더로 이동</button>
          )}
          <button type="button" style={{ ...st.ctxMenuItem, color: '#c62828' }} onClick={() => handleLeaveRoom(roomContextMenu.room.id)}>나가기</button>
        </div>
        );
      })()}

      {profileModalUser && (
        <div style={st.overlay} onClick={() => setProfileModalUser(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>사용자 프로필</h3>
              <UICloseButton onClick={() => setProfileModalUser(null)} />
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>이름</strong> {profileModalUser.name}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>이메일</strong> {profileModalUser.email}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>상태</strong> {onlineUserIds.has(String(profileModalUser.id)) ? <span style={{ color: '#4caf50', fontWeight: 600 }}>● 온라인</span> : <span style={{ color: isDark ? '#64748b' : '#999' }}>○ 오프라인</span>}</p>
            {profileModalUser.statusMessage && <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>상태 메시지</strong> {profileModalUser.statusMessage}</p>}
          </div>
        </div>
      )}

      <ToastProvider />
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const t = getThemeTokens(isDark);
  const bg = t.bgBase;
  const sidebarBg = t.bgSurface;
  const contentBg = t.bgBase;
  const text = t.text;
  const textStrong = t.textStrong;
  const sub = t.textMuted;
  const muted = t.textMuted;
  const border = t.border;
  const inputBg = t.bgMuted;

  return {
    appWrap: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', minWidth: 0, overflow: 'hidden', background: bg },
    layout: { display: 'flex', flex: 1, flexDirection: 'row', minHeight: 0, minWidth: 0 },

    /* Sidebar */
    sidebar: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: `1px solid ${border}` },
    sidebarHeader: { flexShrink: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${border}`, background: sidebarBg },
    logoBox: { width: 36, height: 36, borderRadius: 8, background: isDark ? sidebarBg : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
    logoText: { fontSize: 14, fontWeight: 800, color: '#fff' },
    brandName: { fontSize: 15, fontWeight: 700, color: textStrong },
    profileSection: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: `1px solid ${border}` },
    profileAvatar: { width: 34, height: 34, borderRadius: 10, background: isDark ? '#475569' : '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    profileAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 },
    profileInitial: { fontSize: 13, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' },
    profileName: { fontSize: 13, fontWeight: 600, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    profileStatus: { fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    searchWrap: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0, padding: '8px 12px', borderBottom: `1px solid ${border}` },
    searchInput: { flex: 1, padding: '6px 8px', border: 'none', borderRadius: 6, fontSize: 13, background: inputBg, color: text, outline: 'none', minWidth: 0 },
    searchClearBtn: { width: 24, height: 24, marginLeft: 4, border: 'none', borderRadius: 6, background: 'transparent', color: muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 },
    sidebarContent: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' },

    /* Sections */
    sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '7px 12px', border: 'none', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', cursor: 'pointer', textAlign: 'left' as const },
    sectionChevron: { width: 12, height: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: muted },
    sectionTitle: { fontSize: 13, fontWeight: 700, color: textStrong },
    sectionCount: { fontSize: 11, color: muted },
    sectionUnreadBadge: { minWidth: 16, height: 16, padding: '0 5px', borderRadius: 999, background: t.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    sectionAddBtn: { width: 22, height: 22, borderRadius: 6, background: t.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1, cursor: 'pointer', flexShrink: 0 },
    sectionTextBtn: { height: 22, padding: '0 8px', borderRadius: 6, background: isDark ? '#334155' : '#e5e7eb', color: text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, lineHeight: 1, cursor: 'pointer', flexShrink: 0 },
    folderHeader: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 12px', border: 'none', background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', fontSize: 12, cursor: 'pointer', textAlign: 'left' as const },

    /* App items */
    appItem: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 13, color: text, textAlign: 'left' as const },
    appItemActive: { background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' },

    /* Room list */
    roomList: { listStyle: 'none', margin: 0, padding: 0 },
    roomItem: { padding: '8px 14px', borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
    roomFavoriteIcon: { width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isDark ? '#fbbf24' : '#f59e0b' },
    roomAvatar: { width: 32, height: 32, borderRadius: 10, background: isDark ? '#475569' : '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    roomAvatarImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 },
    roomAvatarInitial: { fontSize: 12, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' },
    roomInfo: { flex: 1, minWidth: 0 },
    roomName: { fontWeight: 600, fontSize: 12, color: text, marginBottom: 1, display: 'flex', alignItems: 'center', gap: 6 },
    roomViewModeBadge: { fontSize: 10, color: muted, flexShrink: 0, padding: '1px 5px', borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
    roomPreview: { fontSize: 11, color: sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    roomMeta: { flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
    roomMuted: { fontSize: 10, color: '#94a3b8' },
    roomTime: { fontSize: 10, color: sub },
    roomUnreadBadge: { minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: t.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },

    /* Right side */
    rightSide: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: contentBg },
    menuBar: { flexShrink: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', borderBottom: `1px solid ${border}`, background: sidebarBg },
    menuBarLeft: {},
    menuBarRight: { display: 'flex', alignItems: 'center', gap: 4 },
    menuBtn: { width: 34, height: 34, padding: 0, border: 'none', borderRadius: 8, background: 'transparent', color: isDark ? '#94a3b8' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    menuBtnActive: { background: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', color: isDark ? '#fff' : '#333' },
    menuBadge: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: t.primary, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    contentArea: { flex: 1, minHeight: 0, minWidth: 0, overflowX: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' },

    /* Empty state */
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 },
    emptyIcon: { width: 56, height: 56, borderRadius: '50%', background: isDark ? '#334155' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub },
    emptyText: { fontSize: 16, fontWeight: 600, color: text, margin: 0 },
    emptyHint: { fontSize: 13, color: sub, margin: 0 },

    /* Panels */
    panelWrap: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, maxWidth: 420 },
    panelHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${border}`, flexWrap: 'wrap' as const, gap: 8 },
    panelTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: textStrong },
    panelBody: { flex: 1, minHeight: 0, overflow: 'auto' },
    panelEmpty: { padding: 32, textAlign: 'center' as const, fontSize: 14, color: sub },
    panelItem: { padding: '12px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 },

    /* Forms */
    formInput: { width: '100%', padding: '8px 12px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' as const, background: isDark ? '#334155' : '#fff', color: text, outline: 'none' },
    formBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, background: t.gradientPrimary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    formBtnCancel: { padding: '8px 16px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, background: isDark ? '#1e293b' : '#fff', color: muted, fontSize: 13, cursor: 'pointer' },
    settingsBtn: { padding: '12px 16px', border: 'none', borderRadius: 10, background: isDark ? '#334155' : '#f0f0f0', color: text, cursor: 'pointer', fontSize: 14, textAlign: 'left' as const },

    /* Online filter */
    onlineFilterBtn: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '4px 8px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 16, background: 'transparent', color: isDark ? '#94a3b8' : '#6b7280', fontSize: 11, cursor: 'pointer', outline: 'none' },
    onlineFilterBtnActive: { borderColor: t.primary, background: t.primary, color: '#fff' },

    /* Tree */
    treeNode: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: 13, color: isDark ? '#cbd5e1' : '#374151' },
    treeUserBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', border: 'none', borderRadius: 6, background: 'transparent', color: isDark ? '#cbd5e1' : '#374151', cursor: 'pointer', width: '100%', textAlign: 'left' as const, fontSize: 13 },

    /* Context menu */
    ctxMenu: { position: 'fixed', zIndex: 10000, minWidth: 120, maxWidth: 200, padding: 4, background: isDark ? '#334155' : '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: `1px solid ${border}`, whiteSpace: 'nowrap' as const },
    ctxMenuItem: { display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', borderRadius: 6, fontSize: 13, color: text, textAlign: 'left' as const, cursor: 'pointer' },

    /* Overlay / Modal */
    overlay: { position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modal: { background: isDark ? '#1e293b' : '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', padding: 20 },

  };
}
