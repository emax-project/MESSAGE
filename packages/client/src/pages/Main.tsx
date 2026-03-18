import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore, useToastStore } from '../store';
import { roomsApi, orgApi, announcementApi, eventsApi, usersApi, bookmarksApi, mentionsApi, foldersApi, authApi, type Room, type OrgCompany, type OrgUser, type Event, type Folder } from '../api';
import { getOllamaConfig, type OllamaMessage } from '../ollama';
import ToastProvider from '../components/ui/ToastProvider';
import TitleBar from '../components/TitleBar';
import { getThemeTokens } from '../components/ui/themeTokens';
import {
  normalizeTimeRange,
  startOfMonth,
  toLocalDateKey,
} from './main/utils/date';
import { useUpdateManager } from './main/hooks/useUpdateManager';
import { useNotificationPrefs } from './main/hooks/useNotificationPrefs';
import { useMainSocket } from './main/hooks/useMainSocket';
import { useMainContentActions } from './main/hooks/useMainContentActions';
import RoomListItem from './main/components/RoomListItem';
import LeftSidebar from './main/components/LeftSidebar';
import TopMenuBar from './main/components/TopMenuBar';
import { type MentionItem } from './main/components/MentionPanel';
import { type BookmarkItem } from './main/components/BookmarkPanel';
import RightContentRouter from './main/components/RightContentRouter';
import MainOverlays from './main/components/MainOverlays';

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

function openChatWindow(roomId: string) {
  if (window.electronAPI?.openChatWindow) {
    window.electronAPI.openChatWindow(roomId);
  } else {
    window.open(`${window.location.origin}/chat/${roomId}`, '_blank', 'width=480,height=680');
  }
}

const MAIN_WINDOW_WIDTH = 1250;
const MAIN_WINDOW_HEIGHT = 900;

export default function Main() {
  const { roomId: selectedRoomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  // Electron: 메인 화면에서는 메인 창 크기를 일관되게 유지한다.
  useEffect(() => {
    if (!token || !window.electronAPI?.windowResize) return;
    const resize = () => window.electronAPI!.windowResize(MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT);
    resize();
    const t = setTimeout(resize, 300);
    return () => clearTimeout(t);
  }, [token]);
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;
  const myEmail = user?.email;
  const logout = useAuthStore((s) => s.logout);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);

  // --- Layout state ---
  const [activePanel, setActivePanel] = useState<'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'ai' | 'settings'>('none');
  const [sectionOpen, setSectionOpen] = useState<{ topic: boolean; chat: boolean }>({ topic: true, chat: true });
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
  const showToast = useToastStore((s) => s.show);
  const {
    mutedRoomIds,
    notificationsSnoozedUntil,
    mutedRoomIdsRef,
    notificationsSnoozedUntilRef,
    toggleMuteRoom,
    snoozeNotifications,
    clearSnooze,
  } = useNotificationPrefs(showToast);
  const {
    appVersion,
    updateStatus,
    updateVersion,
    updateError,
    handleCheckForUpdates,
    handleQuitAndInstall,
  } = useUpdateManager({ hasElectron: !!window.electronAPI, activePanel });
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | undefined>(myId);
  const statusSyncedRef = useRef(false);
  const queryClient = useQueryClient();
  myIdRef.current = myId;
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const isCompactLayout = viewportWidth < 1180;
  const isNarrowLayout = viewportWidth < 980;
  const st = useMemo(() => getStyles(isDark, isCompactLayout, isNarrowLayout), [isDark, isCompactLayout, isNarrowLayout]);
  const panelWrapStyle = (maxWidth: number) => ({
    ...st.panelWrap,
    width: '100%',
    maxWidth: isNarrowLayout ? '100%' : maxWidth,
    margin: '0 auto',
  });

  const notificationStatus = typeof Notification === 'undefined' ? '지원되지 않음' : Notification.permission === 'granted' ? '허용됨' : Notification.permission === 'denied' ? '차단됨' : '미정';
  const requestNotificationPermission = async () => { if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch { /* ignore */ } } };

  const hasElectron = !!window.electronAPI;

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // --- Queries ---
  const { data: allRooms = [], isError: roomsError } = useQuery<Room[]>({ queryKey: ['rooms', myId], queryFn: roomsApi.list, enabled: !!myId });
  const { data: folders = [] } = useQuery<Folder[]>({ queryKey: ['folders'], queryFn: foldersApi.list, enabled: !!myId });
  useMainSocket({
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
  });
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const q = useMemo(() => deferredSearchQuery.trim().toLowerCase(), [deferredSearchQuery]);
  const { topicRooms, chatRooms } = useMemo(() => {
    const filtered = q ? allRooms.filter((r) => r.name?.toLowerCase().includes(q)) : allRooms;
    return {
      topicRooms: filtered.filter((r) => r.isGroup && r.isTopic),
      chatRooms: filtered.filter((r) => !r.isGroup || !r.isTopic),
    };
  }, [allRooms, q]);

  const toggleFolder = useCallback((folderId: string) => setFolderOpen((prev) => ({ ...prev, [folderId]: !prev[folderId] })), []);
  const folderIds = useMemo(() => new Set(folders.map((f) => f.id)), [folders]);
  const roomsByFolder = useMemo(() => {
    const byFolder = new Map<string | null, Room[]>();
    byFolder.set(null, []);
    for (const f of folders) byFolder.set(f.id, []);
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

  const { data: orgTreeRaw = [], isLoading: orgLoading, isError: orgError, refetch: refetchOrg } = useQuery<OrgCompany[]>({ queryKey: ['org', 'tree'], queryFn: orgApi.tree });
  const orgTree = useMemo(() => {
    const tree = orgTreeRaw ?? [];
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
  const { data: events = [] } = useQuery<Event[]>({ queryKey: ['events'], queryFn: eventsApi.list, enabled: !!token });
  const { data: bookmarks = [] } = useQuery({ queryKey: ['bookmarks'], queryFn: bookmarksApi.list, enabled: !!token && activePanel === 'bookmark' });
  const { data: mentions = [] } = useQuery({ queryKey: ['mentions'], queryFn: mentionsApi.list, enabled: !!token && activePanel === 'mention' });
  const { data: unreadMentionCount } = useQuery({ queryKey: ['mentions', 'unread-count'], queryFn: mentionsApi.unreadCount, enabled: !!token, refetchInterval: 30000 });
  const { data: publicRooms = [] } = useQuery({ queryKey: ['rooms', 'public'], queryFn: roomsApi.listPublic, enabled: !!token && sectionOpen.topic });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((ev) => { const key = toLocalDateKey(ev.startAt); if (key) { const list = map.get(key) || []; list.push(ev); map.set(key, list); } });
    return map;
  }, [events]);

  // --- Effects ---
  useEffect(() => { if (!selectedDate) return; setEventForm((prev) => { const n = normalizeTimeRange(selectedDate, prev.startAt, prev.endAt); return { ...prev, startAt: n.startAt, endAt: n.endAt }; }); }, [selectedDate]);
  useEffect(() => { if (onlineData?.userIds) setOnlineUserIds(new Set(onlineData.userIds.map((id) => String(id)))); }, [onlineData?.userIds]);
  useEffect(() => { if (announcementData?.content?.trim()) setShowAnnouncementModal(true); }, [announcementData?.content]);
  useEffect(() => { if (announcementData?.content !== undefined) setAnnouncementEdit(announcementData.content ?? ''); }, [announcementData?.content]);
  useEffect(() => { if (!contextMenu) return; const close = () => setContextMenu(null); const t = setTimeout(() => document.addEventListener('click', close), 100); return () => { clearTimeout(t); document.removeEventListener('click', close); }; }, [contextMenu]);
  useEffect(() => { if (!roomContextMenu) return; const close = () => setRoomContextMenu(null); const t = setTimeout(() => document.addEventListener('click', close), 100); return () => { clearTimeout(t); document.removeEventListener('click', close); }; }, [roomContextMenu]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (contextMenu) setContextMenu(null);
      if (roomContextMenu) setRoomContextMenu(null);
      if (profileModalUser) setProfileModalUser(null);
      if (showAnnouncementModal) setShowAnnouncementModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [contextMenu, roomContextMenu, profileModalUser, showAnnouncementModal]);
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
  const toggleSection = useCallback((key: 'topic' | 'chat') => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] })), []);
  const toggleTree = (key: string) => setTreeOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleToggleFavorite = async (room: Room) => { try { await roomsApi.toggleFavorite(room.id, !room.isFavorite); queryClient.invalidateQueries({ queryKey: ['rooms'] }); } catch (err) { console.error(err); } setRoomContextMenu(null); };
  const handleToggleMuteRoom = (roomId: string) => { toggleMuteRoom(roomId); setRoomContextMenu(null); };
  const handleLeaveRoom = async (roomId: string) => { if (!confirm('채팅방을 나가시겠습니까?')) { setRoomContextMenu(null); return; } try { await roomsApi.leave(roomId); queryClient.invalidateQueries({ queryKey: ['rooms'] }); } catch (err) { console.error(err); } setRoomContextMenu(null); };
  const handleSetStatus = async (msg: string) => { try { await usersApi.updateStatus(msg); setStatusInput(msg); queryClient.invalidateQueries({ queryKey: ['org'] }); } catch (err) { console.error(err); } };
  const handleSelectAvatarFile = useCallback((file: File) => setAvatarEditFile(file), []);
  const handleDeleteAvatar = useCallback(async () => {
    try {
      await usersApi.deleteAvatar();
      const { user: u } = await authApi.me();
      if (u) useAuthStore.getState().setAuth(u, useAuthStore.getState().token);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['org'] });
    } catch (err) {
      console.error(err);
      alert('프로필 사진 삭제에 실패했습니다.');
    }
  }, [queryClient]);
  const handleSaveAnnouncement = useCallback(async () => {
    setAnnouncementSaving(true);
    try {
      await announcementApi.put(announcementEdit);
      queryClient.invalidateQueries({ queryKey: ['announcement'] });
    } catch (err) {
      console.error(err);
    } finally {
      setAnnouncementSaving(false);
    }
  }, [announcementEdit, queryClient]);
  const handleTestNotification = useCallback(() => {
    window.electronAPI?.showNotification('EMAX', '알림 테스트입니다.');
  }, []);
  const handleLogout = useCallback(() => {
    queryClient.removeQueries({ queryKey: ['rooms'] });
    queryClient.removeQueries({ queryKey: ['org'] });
    logout();
  }, [logout, queryClient]);
  const statusLabel = useMemo(() => STATUS_OPTIONS.find((o) => o.id === statusInput)?.label || statusInput, [statusInput]);
  const showStatusBadge = useMemo(() => !!statusInput && STATUS_OPTIONS.some((o) => o.id === statusInput), [statusInput]);
  const handleOpenRoom = useCallback((room: Room) => {
    setActivePanel('none');
    navigate(`/room/${room.id}`, room.viewMode ? { state: { viewMode: room.viewMode } } : undefined);
  }, [navigate]);
  const handleRoomContextMenu = useCallback((e: React.MouseEvent<HTMLLIElement>, room: Room) => {
    e.preventDefault();
    setRoomContextMenu({ x: e.clientX, y: e.clientY, room });
  }, []);
  const handleJoinPublicRoom = useCallback(async (publicRoomId: string) => {
    try {
      await roomsApi.join(publicRoomId);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', 'public'] });
      setActivePanel('none');
      navigate(`/room/${publicRoomId}`);
    } catch (err) {
      console.error(err);
    }
  }, [navigate, queryClient]);
  const handleNavigateHome = useCallback(() => {
    setActivePanel('none');
    navigate('/');
  }, [navigate]);
  const handleSelectMention = useCallback(async (m: MentionItem) => {
    if (!m.readAt) {
      try {
        await mentionsApi.markRead(m.id);
        queryClient.invalidateQueries({ queryKey: ['mentions'] });
        queryClient.invalidateQueries({ queryKey: ['mentions', 'unread-count'] });
      } catch (err) {
        console.error(err);
      }
    }
    if (m.message?.room?.id) {
      setActivePanel('none');
      navigate(`/room/${m.message.room.id}`);
    }
  }, [navigate, queryClient]);
  const handleSelectBookmark = useCallback((b: BookmarkItem) => {
    if (!b.message?.room?.id) return;
    setActivePanel('none');
    navigate(`/room/${b.message.room.id}`);
  }, [navigate]);
  const handleRemoveBookmark = useCallback(async (b: BookmarkItem) => {
    try {
      await bookmarksApi.remove(b.messageId);
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);
  const hasStatusIcon = useCallback((status?: string | null) => !!status && STATUS_OPTIONS.some((o) => o.id === status), []);
  const handleToggleOnlineOnly = useCallback(() => {
    setShowOnlineOnly((v) => !v);
  }, []);
  const handleOpenDirectMessage = useCallback(async (userId: string) => {
    try {
      const room = await roomsApi.create(userId);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setActivePanel('none');
      navigate(`/room/${room.id}`);
    } catch (err) {
      console.error(err);
    }
  }, [navigate, queryClient]);
  const handleUserContextMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>, userInfo: OrgUser) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, user: userInfo });
  }, []);
  const handleTopicCreated = useCallback((id: string) => {
    recentTopicRoomRef.current = { id, at: Date.now() };
  }, []);
  const handleGroupCreated = useCallback((roomId: string, viewMode?: 'chat' | 'board', opts?: { skipRoomsInvalidate?: boolean }) => {
    if (!opts?.skipRoomsInvalidate) queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setActivePanel('none');
    navigate(`/room/${roomId}`, viewMode != null ? { state: { viewMode } } : undefined);
  }, [navigate, queryClient]);
  const handleConfirmAvatar = useCallback(async (croppedFile: File) => {
    await usersApi.uploadAvatar(croppedFile);
    const { user: u } = await authApi.me();
    if (u) useAuthStore.getState().setAuth(u, useAuthStore.getState().token);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    queryClient.invalidateQueries({ queryKey: ['org'] });
  }, [queryClient]);
  const {
    handleEditEvent,
    handleCancelEventEdit,
    handleUpdateEvent,
    handleCreateEvent,
    handleDeleteEvent,
    handleResetAi,
    handleSubmitAi,
    handleOpenChatInNewWindow,
  } = useMainContentActions({
    queryClient,
    selectedDate,
    setEditingEventId,
    setEventForm,
    editingEventId,
    eventForm,
    aiInput,
    aiLoading,
    aiMessages,
    setAiInput,
    setAiMessages,
    setAiLoading,
    navigate,
    openChatWindow,
  });

  // --- Room item renderer ---
  const renderRoomItem = useCallback((r: Room) => (
    <RoomListItem
      key={r.id}
      room={r}
      st={st}
      myId={myId}
      mutedRoomIds={mutedRoomIds}
      onOpenRoom={handleOpenRoom}
      onContextMenu={handleRoomContextMenu}
    />
  ), [st, myId, mutedRoomIds, handleOpenRoom, handleRoomContextMenu]);

  return (
    <div style={st.appWrap}>
      {hasElectron && <TitleBar title="EMAX" isDark={isDark} />}
      <div style={st.layout}>
        <LeftSidebar
          st={st}
          isDark={isDark}
          user={user}
          statusInput={statusInput}
          statusLabel={statusLabel}
          showStatusBadge={showStatusBadge}
          statusBadge={<StatusIcon status={statusInput} size={13} />}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigateHome={handleNavigateHome}
          roomsError={roomsError}
          folders={folders}
          topicRooms={topicRooms}
          chatRooms={chatRooms}
          topicUnreadCount={topicUnreadCount}
          chatUnreadCount={chatUnreadCount}
          sectionOpen={sectionOpen}
          roomsByFolder={roomsByFolder}
          folderOpen={folderOpen}
          publicRooms={publicRooms}
          allRooms={allRooms}
          toggleSection={toggleSection}
          toggleFolder={toggleFolder}
          setShowFolderManageModal={setShowFolderManageModal}
          setCreateGroupFor={setCreateGroupFor}
          setShowCreateGroupModal={setShowCreateGroupModal}
          renderRoomItem={renderRoomItem}
          onJoinPublicRoom={handleJoinPublicRoom}
        />

        {/* ===== RIGHT SIDE ===== */}
        <div style={st.rightSide}>
          <TopMenuBar
            st={st}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            unreadMentionCount={unreadMentionCount?.count ?? 0}
            notificationsSnoozedUntil={notificationsSnoozedUntil}
          />

          {/* Content Area */}
          <div style={st.contentArea}>
            <RightContentRouter
              st={st}
              isDark={isDark}
              isNarrowLayout={isNarrowLayout}
              activePanel={activePanel}
              selectedRoomId={selectedRoomId}
              panelWrapStyle={panelWrapStyle}
              onOpenInNewWindow={handleOpenChatInNewWindow}
              mentions={Array.isArray(mentions) ? mentions : []}
              onSelectMention={handleSelectMention}
              bookmarks={Array.isArray(bookmarks) ? bookmarks : []}
              onSelectBookmark={handleSelectBookmark}
              onRemoveBookmark={handleRemoveBookmark}
              friendsProps={{
                searchQuery,
                showOnlineOnly,
                orgLoading,
                orgError,
                orgTree,
                treeOpen,
                onlineUserIds,
                myId,
                myEmail,
                socketConnected: !!socket?.connected,
                onSearchQueryChange: setSearchQuery,
                onToggleOnlineOnly: handleToggleOnlineOnly,
                onRetryOrg: () => { void refetchOrg(); },
                onToggleTree: toggleTree,
                onOpenDirectMessage: handleOpenDirectMessage,
                onUserContextMenu: handleUserContextMenu,
                hasStatusIcon,
                renderStatusIcon: (status, size = 11) => <StatusIcon status={status} size={size} />,
              }}
              scheduleProps={{
                calendarMonth,
                selectedDate,
                eventsByDate,
                eventForm,
                editingEventId,
                setCalendarMonth,
                setSelectedDate,
                setEventForm,
                onUpdateEvent: handleUpdateEvent,
                onCreateEvent: handleCreateEvent,
                onCancelEdit: handleCancelEventEdit,
                onEditEvent: handleEditEvent,
                onDeleteEvent: handleDeleteEvent,
              }}
              aiProps={{
                modelName: getOllamaConfig().model,
                aiMessages,
                aiInput,
                aiLoading,
                setAiInput,
                onSubmitAi: handleSubmitAi,
                onResetAi: handleResetAi,
              }}
              settingsProps={{
                notificationsSnoozedUntil,
                snoozeNotifications,
                clearSnooze,
                toggleDark,
                hasElectron,
                appVersion,
                updateStatus,
                updateVersion,
                updateError,
                handleCheckForUpdates,
                handleQuitAndInstall,
                statusInput,
                statusOptions: STATUS_OPTIONS,
                renderStatusIcon: (status, size = 18) => <StatusIcon status={status} size={size} />,
                handleSetStatus,
                notificationStatus,
                announcementEdit,
                setAnnouncementEdit,
                announcementSaving,
                onSaveAnnouncement: handleSaveAnnouncement,
                onSelectAvatarFile: handleSelectAvatarFile,
                onDeleteAvatar: handleDeleteAvatar,
                onTestNotification: handleTestNotification,
                onRequestNotificationPermission: requestNotificationPermission,
                onLogout: handleLogout,
                user,
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}
      <MainOverlays
        st={st}
        isDark={isDark}
        showAnnouncementModal={showAnnouncementModal}
        announcementContent={announcementData?.content ?? undefined}
        setShowAnnouncementModal={setShowAnnouncementModal}
        showCreateGroupModal={showCreateGroupModal}
        createGroupFor={createGroupFor}
        setShowCreateGroupModal={setShowCreateGroupModal}
        onTopicCreated={handleTopicCreated}
        onGroupCreated={handleGroupCreated}
        avatarEditFile={avatarEditFile}
        setAvatarEditFile={setAvatarEditFile}
        onConfirmAvatar={handleConfirmAvatar}
        showFolderManageModal={showFolderManageModal}
        setShowFolderManageModal={setShowFolderManageModal}
        topicRooms={topicRooms}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        setProfileModalUser={setProfileModalUser}
        roomContextMenu={roomContextMenu}
        setRoomContextMenu={setRoomContextMenu}
        mutedRoomIds={mutedRoomIds}
        onToggleFavorite={handleToggleFavorite}
        onToggleMuteRoom={handleToggleMuteRoom}
        onLeaveRoom={handleLeaveRoom}
        profileModalUser={profileModalUser}
        onlineUserIds={onlineUserIds}
      />

      <ToastProvider />
    </div>
  );
}

function getStyles(isDark: boolean, isCompactLayout: boolean, isNarrowLayout: boolean): Record<string, React.CSSProperties> {
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
    sidebar: { width: isNarrowLayout ? 232 : 260, flexShrink: 0, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: `1px solid ${border}` },
    sidebarHeader: { flexShrink: 0, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isNarrowLayout ? '0 10px' : '0 16px', borderBottom: `1px solid ${border}`, background: sidebarBg },
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
    menuBar: { flexShrink: 0, minHeight: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isNarrowLayout ? '6px 10px' : '0 16px', borderBottom: `1px solid ${border}`, background: sidebarBg, gap: 8 },
    menuBarLeft: { flex: 1, minWidth: 0 },
    menuBarRight: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: isCompactLayout ? 'wrap' as const : 'nowrap' as const, justifyContent: 'flex-end' as const },
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
    panelWrap: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%', maxWidth: isCompactLayout ? '100%' : 420 },
    panelHeader: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isNarrowLayout ? '12px 14px' : '14px 20px', borderBottom: `1px solid ${border}`, flexWrap: 'wrap' as const, gap: 8 },
    panelTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: textStrong },
    panelBody: { flex: 1, minHeight: 0, overflow: 'auto' },
    panelEmpty: { padding: 32, textAlign: 'center' as const, fontSize: 14, color: sub },
    panelItem: { padding: '12px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#f0f0f0'}`, cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 },

    /* Forms */
    formInput: { width: '100%', padding: '8px 12px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' as const, background: isDark ? '#334155' : '#fff', color: text, outline: 'none' },
    formBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, background: t.gradientPrimary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
    formBtnCancel: { padding: '8px 16px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, background: isDark ? '#1e293b' : '#fff', color: muted, fontSize: 13, cursor: 'pointer' },
    settingsBtn: { width: '100%', padding: '12px 16px', border: 'none', borderRadius: 10, background: isDark ? '#334155' : '#f0f0f0', color: text, cursor: 'pointer', fontSize: 14, textAlign: 'left' as const },

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
