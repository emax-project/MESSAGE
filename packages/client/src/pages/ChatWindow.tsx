import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore } from '../store';
import { roomsApi, filesApi, eventsApi, pollsApi, projectsApi, bookmarksApi, getSocketUrl, type Room, type Message, type ReactionGroup, type ReaderInfo, type FileInfo } from '../api';
import FileMessage from '../components/FileMessage';
import FileUploadButton from '../components/FileUploadButton';
import InviteModal from '../components/InviteModal';
import EventCard from '../components/EventCard';
import PollCard from '../components/PollCard';
import PollCreateModal from '../components/PollCreateModal';
import ForwardModal from '../components/ForwardModal';
import EmojiPicker from '../components/EmojiPicker';
import MentionPopup from '../components/MentionPopup';
import PinnedMessages from '../components/PinnedMessages';
import TaskCreateModal from '../components/TaskCreateModal';
import TitleBar from '../components/TitleBar';
import LinkPreview, { extractFirstUrl } from '../components/LinkPreview';

const MAX_DROP_SIZE = 20 * 1024 * 1024 * 1024;
const EDIT_LIMIT_MS = 5 * 60 * 1000;

function isSystemMessage(content: string): boolean {
  return /님이\s.+님을\s초대했습니다$/.test(content) || content === '[파일 만료됨]' || /님이 채팅방을 나갔습니다$/.test(content);
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function canEditOrDelete(msg: Message, myId?: string): boolean {
  if (!myId || msg.senderId !== myId || msg.deletedAt) return false;
  return Date.now() - new Date(msg.createdAt).getTime() < EDIT_LIMIT_MS;
}

function renderContentWithMentions(content: string, isDark: boolean): React.ReactNode {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 600 }}>{part}</span>;
    }
    return part;
  });
}

type ChatWindowProps = { embedded?: boolean; onOpenInNewWindow?: () => void };

export default function ChatWindow({ embedded, onOpenInNewWindow }: ChatWindowProps = {}) {
  const { roomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);
  const isDark = useThemeStore((s) => s.isDark);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dropUploading, setDropUploading] = useState(false);
  const [dropProgress, setDropProgress] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareEventOpen, setShareEventOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [forwardOpen, setForwardOpen] = useState<string | null>(null);
  const [emojiPickerMsg, setEmojiPickerMsg] = useState<string | null>(null);
  const [pollCreateOpen, setPollCreateOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [taskFromMessage, setTaskFromMessage] = useState<{ title: string; messageId: string } | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [readersPopup, setReadersPopup] = useState<{ messageId: string; readers: ReaderInfo[]; x: number; y: number } | null>(null);
  const [threadOpen, setThreadOpen] = useState<{ parentId: string; parent: Message; replies: Message[] } | null>(null);
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false);
  const [fileDrawerData, setFileDrawerData] = useState<FileInfo[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | undefined>(myId);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMarkReadRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const SCROLL_BOTTOM_THRESHOLD = 80;
  const checkAtBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
    setShowScrollToBottom(!atBottom);
  };
  const scrollToBottom = () => {
    messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: 'auto' });
  };
  const queryClient = useQueryClient();
  myIdRef.current = myId;

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['rooms', roomId],
    queryFn: () => (roomId ? roomsApi.get(roomId) : Promise.reject(new Error('no roomId'))),
    enabled: !!roomId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['rooms', roomId, 'messages'],
    queryFn: () => (roomId ? roomsApi.messages(roomId) : Promise.resolve({ messages: [], nextCursor: null, hasMore: false })),
    enabled: !!roomId,
  });
  const { data: myEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
    enabled: !!token && !!shareEventOpen,
  });
  const messages = messagesData?.messages ?? [];

  useEffect(() => {
    const t = setTimeout(checkAtBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length, roomId]);

  // 채팅창이 열리면 입력 칸에 포커스
  useEffect(() => {
    if (!roomId || !room) return;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [roomId, room]);

  // Socket connection
  useEffect(() => {
    if (!token || !roomId) return;
    if (socketRef.current?.connected) return;
    const url = getSocketUrl();
    const s = io(url, { path: '/socket.io', auth: { token } });
    socketRef.current = s;
    s.on('connect_error', (err: { message?: string }) => {
      if (err?.message?.includes('invalid token')) {
        try {
          localStorage.setItem('forcedLogoutMessage', '다른 기기에서 로그인되어 로그아웃되었습니다.');
          localStorage.removeItem('token');
          if (typeof window !== 'undefined') window.location.href = '/login';
        } catch {
          // ignore
        }
      }
    });
    s.on('connect', () => s.emit('join_room', roomId));
    s.on('message', (msg: Message) => {
      if (msg.roomId !== roomId) return;
      const withDefaults = { ...msg, readCount: msg.readCount ?? 0, reactions: msg.reactions ?? [], poll: msg.poll ?? null };
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old) return { messages: [withDefaults], nextCursor: null, hasMore: false };
          if (old.messages.some((m) => m.id === msg.id)) return old;
          return { ...old, messages: [withDefaults, ...old.messages] };
        }
      );
      queryClient.refetchQueries({ queryKey: ['rooms'] });
      if (msg.senderId !== myIdRef.current) {
        const now = Date.now();
        if (now - lastMarkReadRef.current > 1000) {
          lastMarkReadRef.current = now;
          roomsApi.markRead(roomId).catch(() => {});
        }
      }
    });
    s.on('message_updated', (payload: { id: string; roomId: string; content: string; editedAt: string }) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === payload.id ? { ...m, content: payload.content, editedAt: payload.editedAt } : m) };
        }
      );
    });
    s.on('message_deleted', (payload: { id: string; roomId: string }) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === payload.id ? { ...m, content: '[삭제된 메시지]', deletedAt: new Date().toISOString() } : m) };
        }
      );
    });
    s.on('reaction_updated', (payload: { messageId: string; reactions: ReactionGroup[] }) => {
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old) return old;
          return { ...old, messages: old.messages.map((m) => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m) };
        }
      );
    });
    s.on('poll_voted', (payload: { messageId?: string; id: string; question: string; isMultiple: boolean; options: Array<{ id: string; text: string; voteCount: number; voterIds: string[] }> }) => {
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((m) => {
              if (m.poll && m.poll.id === payload.id) {
                return { ...m, poll: { ...m.poll, options: payload.options } };
              }
              return m;
            }),
          };
        }
      );
    });
    s.on('message_pinned', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    });
    s.on('message_unpinned', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    });
    s.on('members_added', (payload: { roomId: string }) => {
      if (payload.roomId === roomId) {
        queryClient.refetchQueries({ queryKey: ['rooms', roomId] });
        queryClient.refetchQueries({ queryKey: ['rooms'] });
      }
    });
    s.on('member_left', () => {
      queryClient.refetchQueries({ queryKey: ['rooms', roomId] });
      queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
    });
    const handleProjectEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    };
    s.on('project_updated', handleProjectEvent);
    s.on('task_created', handleProjectEvent);
    s.on('task_updated', handleProjectEvent);
    s.on('task_moved', handleProjectEvent);
    s.on('task_deleted', handleProjectEvent);
    s.on('room_read', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId !== roomId || payload.userId === myIdRef.current) return;
      queryClient.setQueryData<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
        ['rooms', roomId, 'messages'],
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
      queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
    });
    s.on('mention', (payload: { roomId: string; senderName: string; content: string }) => {
      if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { showNotification?: (a: string, b: string) => void } }).electronAPI?.showNotification) {
        (window as unknown as { electronAPI: { showNotification: (a: string, b: string) => void } }).electronAPI.showNotification(
          `${payload.senderName}님이 회원님을 멘션했습니다`,
          payload.content
        );
      }
    });
    setSocket(s);
    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, roomId, queryClient]);

  useEffect(() => {
    if (roomId) {
      roomsApi.markRead(roomId).then(() => {
        queryClient.refetchQueries({ queryKey: ['rooms'] });
        queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
      }).catch(() => {});
    }
  }, [roomId, queryClient]);

  useEffect(() => {
    if (!roomId) return;
    const setActive = (focused: boolean) => {
      try {
        localStorage.setItem('activeChatRoomId', roomId);
        localStorage.setItem('activeChatFocused', focused ? '1' : '0');
      } catch {
        // ignore
      }
    };
    setActive(typeof document !== 'undefined' ? !document.hidden : true);
    const onFocusActive = () => setActive(true);
    const onBlur = () => setActive(false);
    const onVisibilityActive = () => setActive(!(typeof document !== 'undefined' && document.hidden));
    window.addEventListener('focus', onFocusActive);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityActive);
    const markIfVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      roomsApi.markRead(roomId).catch(() => {});
    };
    const onFocusRead = () => markIfVisible();
    const onVisibilityRead = () => markIfVisible();
    window.addEventListener('focus', onFocusRead);
    document.addEventListener('visibilitychange', onVisibilityRead);
    return () => {
      window.removeEventListener('focus', onFocusActive);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityActive);
      try {
        const current = localStorage.getItem('activeChatRoomId');
        if (current === roomId) {
          localStorage.removeItem('activeChatRoomId');
          localStorage.removeItem('activeChatFocused');
        }
      } catch {
        // ignore
      }
      window.removeEventListener('focus', onFocusRead);
      document.removeEventListener('visibilitychange', onVisibilityRead);
    };
  }, [roomId]);

  // 채팅 열릴 때/메시지 바뀔 때 맨 끝으로 (스크롤 컨테이너 직접 사용 + 레이아웃/이미지 반영 후 재스크롤)
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => {
      el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(run);
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const t = setTimeout(() => document.addEventListener('click', close), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [contextMenu]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socket || !roomId) return;

    if (editingMsg) {
      roomsApi.editMessage(roomId, editingMsg.id, text).then(() => {
        setEditingMsg(null);
        setInput('');
      }).catch(console.error);
      return;
    }

    socket.emit('message', {
      roomId,
      content: text,
      replyToId: replyTo?.id || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setInput('');
    setReplyTo(null);
  };

  const handleSearch = async () => {
    if (!roomId || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const res = await roomsApi.searchMessages(roomId, searchQuery.trim());
      setSearchResults(res.messages);
    } catch { setSearchResults([]); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Mention detection
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleMentionSelect = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@\S*$/, `@${name} `);
    setInput(replaced + textAfter);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || !roomId || dropUploading) return;
    if (file.size > MAX_DROP_SIZE) return;
    setDropUploading(true);
    setDropProgress(0);
    try {
      await filesApi.upload(roomId, file, (pct) => setDropProgress(pct));
    } catch (err) {
      console.error('Drop upload failed:', err);
    } finally {
      setDropUploading(false);
      setDropProgress(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setEditingMsg(null);
      setMentionQuery(null);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!roomId) return;
    try {
      await roomsApi.toggleReaction(roomId, messageId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForward = async (targetRoomId: string) => {
    if (!forwardOpen) return;
    try {
      await roomsApi.forwardMessage(targetRoomId, forwardOpen);
    } catch (err) {
      console.error(err);
    }
    setForwardOpen(null);
  };

  const handleDelete = async (msg: Message) => {
    if (!roomId || !confirm('이 메시지를 삭제하시겠습니까?')) return;
    try {
      await roomsApi.deleteMessage(roomId, msg.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePin = async (messageId: string) => {
    if (!roomId) return;
    try {
      await roomsApi.pinMessage(roomId, messageId);
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePoll = async (question: string, options: string[], isMultiple: boolean) => {
    if (!roomId) return;
    try {
      await pollsApi.create({ roomId, question, options, isMultiple });
      setPollCreateOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Load bookmarks
  useEffect(() => {
    bookmarksApi.list().then((list) => {
      setBookmarkedIds(new Set(list.map((b) => b.messageId)));
    }).catch(() => {});
  }, []);

  const handleToggleBookmark = async (messageId: string) => {
    try {
      if (bookmarkedIds.has(messageId)) {
        await bookmarksApi.remove(messageId);
        setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(messageId); return s; });
      } else {
        await bookmarksApi.add(messageId);
        setBookmarkedIds((prev) => new Set(prev).add(messageId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShowReaders = async (messageId: string, e: React.MouseEvent) => {
    if (!roomId) return;
    try {
      const { readers } = await roomsApi.messageReaders(roomId, messageId);
      setReadersPopup({ messageId, readers, x: e.clientX, y: e.clientY });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenThread = async (messageId: string) => {
    if (!roomId) return;
    try {
      const data = await roomsApi.thread(roomId, messageId);
      setThreadOpen({ parentId: messageId, parent: data.parent, replies: data.replies });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFileDrawer = async () => {
    if (!roomId) return;
    try {
      const { files } = await roomsApi.files(roomId);
      setFileDrawerData(files);
      setFileDrawerOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Close readers popup on outside click
  useEffect(() => {
    if (!readersPopup) return;
    const close = () => setReadersPopup(null);
    const t = setTimeout(() => document.addEventListener('click', close), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [readersPopup]);

  if (!roomId) {
    if (!embedded) navigate('/', { replace: true });
    return null;
  }

  if (roomLoading || !room) {
    return (
      <div style={s.layout(isDark)}>
        <div style={s.loading(isDark)}>채팅방 로딩 중...</div>
      </div>
    );
  }

  const displayMessages = [...messages].reverse();
  const hasElectron = typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI;
  const members = (room as Room).members ?? [];

  const wrapperStyle: React.CSSProperties = embedded
    ? { flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: isDark ? '#0f172a' : '#fafafa' }
    : s.appWrap(isDark);

  return (
    <div style={wrapperStyle}>
      <style>{`
        @keyframes message-bubble-highlight-blink {
          0%, 100% { outline-color: rgba(59, 130, 246, 0.9); }
          50% { outline-color: rgba(59, 130, 246, 0.2); }
        }
        .message-bubble-highlight {
          outline: 2px solid rgba(59, 130, 246, 0.8);
          outline-offset: 2px;
          animation: message-bubble-highlight-blink 0.5s ease-in-out 3;
        }
      `}</style>
      {!embedded && hasElectron && <TitleBar title={room.name} isDark={isDark} />}
      <div
        style={embedded ? { ...s.layout(isDark), flex: 1, minHeight: 0, minWidth: 0 } : s.layout(isDark)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {(dragOver || dropUploading) && (
          <div style={s.dropOverlay()}>
            <div style={s.dropContent()}>
              <span style={s.dropText()}>{dropUploading ? `업로드 중 ${dropProgress}%` : '파일을 여기에 놓으세요'}</span>
            </div>
          </div>
        )}
        <header style={s.chatHeader(isDark)}>
          <span style={s.chatHeaderName(isDark)}>{room.name}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {embedded && onOpenInNewWindow && (
              <button type="button" style={s.headerIconBtn(isDark)} onClick={onOpenInNewWindow} title="새 창으로 열기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => setSearchOpen(!searchOpen)} title="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => {
              const eApi = (window as unknown as { electronAPI?: { openKanbanWindow?: (id: string) => void } }).electronAPI;
              if (eApi?.openKanbanWindow) {
                eApi.openKanbanWindow(roomId!);
              } else {
                window.open(`${window.location.origin}/kanban/${roomId}`, '_blank', 'width=1100,height=750');
              }
            }} title="프로젝트 보드">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="10" rx="1" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark)} onClick={handleOpenFileDrawer} title="파일함">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => setInviteOpen(true)} title="멤버 초대">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </button>
          </div>
        </header>

        {searchOpen && (
          <div style={s.searchBar(isDark)}>
            <input
              type="text"
              placeholder="메시지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={s.searchInput(isDark)}
              autoFocus
            />
            <button type="button" onClick={handleSearch} style={s.searchBtn(isDark)}>검색</button>
            <button type="button" onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery(''); }} style={s.searchCloseBtn(isDark)}>x</button>
          </div>
        )}
        {searchResults.length > 0 && (
          <div style={s.searchResults(isDark)}>
            {searchResults.map((sr) => (
              <div key={sr.id} style={s.searchResultItem(isDark)}>
                <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginRight: 8 }}>{sr.sender.name}</span>
                <span style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#333' }}>{sr.content}</span>
                <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#aaa', marginLeft: 'auto', flexShrink: 0 }}>
                  {new Date(sr.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        )}

        {inviteOpen && room && (
          <InviteModal
            roomId={roomId!}
            currentMemberIds={members.map((m: { id: string }) => m.id)}
            onClose={() => setInviteOpen(false)}
            onInvited={(newRoomId: string) => {
              queryClient.refetchQueries({ queryKey: ['rooms'] });
              if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { openChatWindow?: (id: string) => void } }).electronAPI?.openChatWindow) {
                (window as unknown as { electronAPI: { openChatWindow: (id: string) => void } }).electronAPI.openChatWindow(newRoomId);
              } else {
                const url = `${window.location.origin}/chat/${newRoomId}`;
                window.open(url, '_blank', 'width=480,height=680');
              }
            }}
          />
        )}

        <PinnedMessages roomId={roomId!} />

        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            ref={messagesScrollRef}
            onScroll={checkAtBottom}
            style={s.messages(isDark)}
          >
          {displayMessages.map((m, idx) => {
            const elements: React.ReactNode[] = [];
            const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
            const curDateKey = getDateKey(m.createdAt);
            const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
            if (idx === 0 || curDateKey !== prevDateKey) {
              elements.push(
                <div key={`date-${curDateKey}-${m.id}`} style={s.dateSeparator()}>
                  <span style={s.dateSeparatorText()}>{formatDateLabel(new Date(m.createdAt))}</span>
                </div>
              );
            }

            if (isSystemMessage(m.content) && !m.fileUrl && m.eventTitle == null && !m.poll) {
              elements.push(
                <div key={m.id} style={s.systemMessageRow()}>
                  <span style={s.systemMessageText()}>{m.content}</span>
                </div>
              );
              return elements;
            }

            if (m.deletedAt) {
              elements.push(
                <div key={m.id} style={{ ...s.messageRow(), ...(m.senderId === myId ? s.messageRowMine() : {}) }}>
                  <div style={s.messageRowInner()}>
                    {m.senderId !== myId && <div style={s.avatarWrap()} aria-hidden><span style={s.avatarCircle(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span></div>}
                    {m.senderId === myId && <div style={s.avatarSpacer()} />}
                    <div style={{ ...s.messageBubble(isDark), ...(m.senderId === myId ? s.messageBubbleMine(isDark) : {}), opacity: 0.5, fontStyle: 'italic' }}>
                      <span style={s.messageContent()}>[삭제된 메시지]</span>
                    </div>
                  </div>
                </div>
              );
              return elements;
            }

            const isHovered = hoveredMsg === m.id;

            const isHighlighted = highlightedMsgId === m.id;
            elements.push(
              <div
                key={m.id}
                id={`msg-${m.id}`}
                style={{ ...s.messageRow(), ...(m.senderId === myId ? s.messageRowMine() : {}) }}
                onMouseEnter={() => setHoveredMsg(m.id)}
                onMouseLeave={() => setHoveredMsg(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, message: m });
                }}
              >
                {m.senderId !== myId && <div style={s.senderLabel(isDark)}>{m.sender.name}</div>}

                {/* Reply preview - 클릭 시 원본 메시지로 스크롤 */}
                {m.replyTo && (
                  <div
                    role="button"
                    tabIndex={0}
                    style={s.replyPreview(isDark, m.senderId === myId)}
                    onClick={() => {
                      const targetId = m.replyTo!.id;
                      const el = document.getElementById(`msg-${targetId}`);
                      if (el) {
                        setHighlightedMsgId(null);
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          setHighlightedMsgId(targetId);
                          setTimeout(() => setHighlightedMsgId(null), 2000);
                        }, 400);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const targetId = m.replyTo!.id;
                        const el = document.getElementById(`msg-${targetId}`);
                        if (el) {
                          setHighlightedMsgId(null);
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => {
                            setHighlightedMsgId(targetId);
                            setTimeout(() => setHighlightedMsgId(null), 2000);
                          }, 400);
                        }
                      }
                    }}
                  >
                    <span style={s.replyPreviewLabel(isDark)}>{m.replyTo.sender?.name}</span>
                    <span style={s.replyPreviewContent(isDark)}>{m.replyTo.content}</span>
                  </div>
                )}

                <div style={s.messageRowInner()}>
                  {m.senderId !== myId ? (
                    <div style={s.avatarWrap()} aria-hidden>
                      <span style={s.avatarCircle(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  ) : (
                    <div style={s.avatarSpacer()} aria-hidden />
                  )}
                  <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                    <div
                      className={isHighlighted ? 'message-bubble-highlight' : undefined}
                      style={{ ...s.messageBubble(isDark), ...(m.senderId === myId ? s.messageBubbleMine(isDark) : {}) }}
                    >
                      {m.poll ? (
                        <PollCard poll={m.poll} myId={myId} isMine={m.senderId === myId} />
                      ) : m.eventTitle != null ? (
                        <EventCard title={m.eventTitle} startAt={m.eventStartAt!} endAt={m.eventEndAt!} description={m.eventDescription ?? undefined} isMine={m.senderId === myId} />
                      ) : m.fileUrl ? (
                        <FileMessage message={m} />
                      ) : (
                        <>
                          <span style={s.messageContent()}>{renderContentWithMentions(m.content, isDark)}</span>
                          {extractFirstUrl(m.content) && (
                            <LinkPreview url={extractFirstUrl(m.content)!} isDark={isDark} />
                          )}
                        </>
                      )}
                      {m.editedAt && <span style={{ fontSize: 10, opacity: 0.6, marginTop: 4, display: 'block' }}>(수정됨)</span>}
                      {/* 보낸 시간·읽음: 말풍선 안 오른쪽 끝에 고정해 길어져도 항상 보이게 */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={s.metaTime(isDark)}>
                          {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.senderId === myId && room && (() => {
                          const memberCount = room.members?.length ?? 0;
                          if (memberCount <= 2) return null;
                          const totalReaders = memberCount - 1;
                          const readCount = m.readCount ?? 0;
                          const unreadCount = Math.max(0, totalReaders - readCount);
                          if (unreadCount === 0) return null;
                          return (
                            <span
                              role="button"
                              tabIndex={0}
                              style={{ ...s.readStatusMine(isDark), cursor: 'pointer' }}
                              onClick={(e) => handleShowReaders(m.id, e)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleShowReaders(m.id, e as unknown as React.MouseEvent); }}
                              title="읽음 상세 보기"
                            >{unreadCount}</span>
                          );
                        })()}
                      </div>
                    </div>
                    {/* Hover actions - 절대 위치로 레이아웃 밀림 방지 */}
                    {isHovered && !m.deletedAt && (
                      <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 6, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <button type="button" onClick={() => setReplyTo(m)} style={s.hoverActionBtn(isDark)} title="답장">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10l7-7v4c8 0 11 4 11 11-2-5-5-7-11-7v4l-7-5z"/></svg>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button type="button" onClick={() => setEmojiPickerMsg(emojiPickerMsg === m.id ? null : m.id)} style={s.hoverActionBtn(isDark)} title="반응">
                            {'\uD83D\uDE0A'}
                          </button>
                          {emojiPickerMsg === m.id && (
                            <EmojiPicker onSelect={(emoji) => handleReaction(m.id, emoji)} onClose={() => setEmojiPickerMsg(null)} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reactions display */}
                {m.reactions && m.reactions.length > 0 && (
                  <div style={s.reactionsRow(m.senderId === myId)}>
                    {m.reactions.map((r: ReactionGroup) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => handleReaction(m.id, r.emoji)}
                        style={s.reactionBadge(isDark, myId ? r.userIds.includes(myId) : false)}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
            return elements;
          })}
          <div ref={messagesEndRef} />
        </div>
        {showScrollToBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            style={s.scrollToBottomBtn(isDark)}
            aria-label="맨 아래로"
            title="맨 아래로"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div style={{ ...s.ctxMenu(isDark), left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); inputRef.current?.focus(); }}>
              답장
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setForwardOpen(contextMenu.message.id); setContextMenu(null); }}>
              전달
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handleToggleBookmark(contextMenu.message.id); setContextMenu(null); }}>
              {bookmarkedIds.has(contextMenu.message.id) ? '북마크 해제' : '북마크'}
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handlePin(contextMenu.message.id); setContextMenu(null); }}>
              고정
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handleOpenThread(contextMenu.message.id); setContextMenu(null); }}>
              스레드 보기
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setTaskFromMessage({ title: contextMenu.message.content, messageId: contextMenu.message.id }); setContextMenu(null); }}>
              태스크로 변환
            </button>
            {canEditOrDelete(contextMenu.message, myId) && (
              <>
                <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => {
                  setEditingMsg(contextMenu.message);
                  setInput(contextMenu.message.content);
                  setContextMenu(null);
                  inputRef.current?.focus();
                }}>
                  수정
                </button>
                <button type="button" style={{ ...s.ctxMenuItem(isDark), color: '#c62828' }} onClick={() => { handleDelete(contextMenu.message); setContextMenu(null); }}>
                  삭제
                </button>
              </>
            )}
          </div>
        )}

        {forwardOpen && <ForwardModal onClose={() => setForwardOpen(null)} onSelect={handleForward} />}
        {pollCreateOpen && <PollCreateModal onClose={() => setPollCreateOpen(false)} onCreate={handleCreatePoll} />}

        {taskFromMessage && roomId && (() => {
          const projectsQuery = queryClient.getQueryData<import('../api').Project[]>(['projects', roomId]);
          const proj = projectsQuery?.[0];
          if (!proj) {
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setTaskFromMessage(null)}>
                <div style={{ background: isDark ? '#1e293b' : '#fff', borderRadius: 12, padding: 24, maxWidth: 360, textAlign: 'center' as const }} onClick={(e) => e.stopPropagation()}>
                  <p style={{ fontSize: 14, color: isDark ? '#e2e8f0' : '#333', margin: '0 0 16px' }}>프로젝트가 없습니다. 먼저 칸반 보드에서 프로젝트를 생성해주세요.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" onClick={() => setTaskFromMessage(null)} style={{ padding: '8px 16px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, background: 'none', color: isDark ? '#94a3b8' : '#666', fontSize: 13, cursor: 'pointer' }}>닫기</button>
                    <button type="button" onClick={() => {
                      setTaskFromMessage(null);
                      const eApi = (window as unknown as { electronAPI?: { openKanbanWindow?: (id: string) => void } }).electronAPI;
                      if (eApi?.openKanbanWindow) {
                        eApi.openKanbanWindow(roomId!);
                      } else {
                        window.open(`${window.location.origin}/kanban/${roomId}`, '_blank', 'width=1100,height=750');
                      }
                    }} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>보드 열기</button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <TaskCreateModal
              boards={proj.boards}
              members={room?.members || []}
              defaultTitle={taskFromMessage.title}
              onSubmit={async (data) => {
                try {
                  await projectsApi.createTask(proj.id, { ...data, messageId: taskFromMessage.messageId });
                  queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
                  setTaskFromMessage(null);
                } catch (err) {
                  console.error(err);
                }
              }}
              onClose={() => setTaskFromMessage(null)}
            />
          );
        })()}

        {shareEventOpen && (
          <div style={s.shareEventOverlay()} onClick={() => setShareEventOpen(false)}>
            <div style={s.shareEventModal(isDark)} onClick={(e) => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>일정 공유</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {myEvents.length === 0 ? (
                  <li style={{ padding: 16, color: isDark ? '#94a3b8' : '#888', fontSize: 14 }}>등록된 일정이 없습니다.</li>
                ) : (
                  myEvents.map((ev) => (
                    <li
                      key={ev.id}
                      style={{ padding: 12, borderBottom: `1px solid ${isDark ? '#475569' : '#f0f0f0'}`, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!socket || !roomId) return;
                        socket.emit('message', { roomId, content: '', sharedEvent: { title: ev.title, startAt: ev.startAt, endAt: ev.endAt, description: ev.description ?? '' } });
                        queryClient.invalidateQueries({ queryKey: ['rooms'] });
                        setShareEventOpen(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (document.activeElement as HTMLElement)?.click()}
                    >
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333', marginBottom: 4 }}>{ev.title}</strong>
                      <span style={{ display: 'block', fontSize: 12, color: isDark ? '#94a3b8' : '#888' }}>
                        {new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <button type="button" style={{ marginTop: 12, padding: '10px 20px', border: 'none', borderRadius: 8, background: isDark ? '#334155' : '#f0f0f0', color: isDark ? '#e2e8f0' : '#333', fontSize: 14, cursor: 'pointer', width: '100%' }} onClick={() => setShareEventOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Reply/Edit indicator */}
        {(replyTo || editingMsg) && (
          <div style={s.replyIndicator(isDark)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb' }}>
                {editingMsg ? '메시지 수정' : `${replyTo!.sender.name}에게 답장`}
              </span>
              <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingMsg ? editingMsg.content : replyTo!.content}
              </span>
            </div>
            <button type="button" onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }} style={{ border: 'none', background: 'none', color: isDark ? '#94a3b8' : '#888', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>x</button>
          </div>
        )}

        {/* Mention popup */}
        <div style={{ position: 'relative' }}>
          {mentionQuery !== null && (
            <MentionPopup members={members} query={mentionQuery} onSelect={handleMentionSelect} />
          )}
        </div>

        <div style={s.inputRow(isDark)}>
          <div style={s.plusWrap()}>
            <button type="button" style={s.plusBtn(isDark)} onClick={() => setActionsOpen((v) => !v)} disabled={!socket} title="추가">+</button>
            {actionsOpen && (
              <div style={s.plusMenu(isDark)}>
                <button type="button" style={s.plusMenuItem(isDark)} onClick={() => { setActionsOpen(false); setShareEventOpen(true); }}>
                  일정 공유
                </button>
                <div style={{ height: 1, background: isDark ? '#475569' : '#eef2f7', margin: '2px 0' }} />
                <button type="button" style={s.plusMenuItem(isDark)} onClick={() => { setActionsOpen(false); setPollCreateOpen(true); }}>
                  투표 만들기
                </button>
                <div style={{ height: 1, background: isDark ? '#475569' : '#eef2f7', margin: '2px 0' }} />
                <FileUploadButton roomId={roomId!} disabled={!socket} />
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="메시지를 입력하세요"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            style={s.input(isDark)}
          />
          <button type="button" onClick={sendMessage} style={s.sendBtn(isDark)}>
            {editingMsg ? '수정' : '전송'}
          </button>
        </div>

        {/* Readers popup */}
        {readersPopup && (
          <div style={{ position: 'fixed', zIndex: 10010, left: readersPopup.x, top: readersPopup.y, background: isDark ? '#334155' : '#fff', borderRadius: 10, boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)', border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`, minWidth: 180, maxHeight: 240, overflow: 'auto', padding: 8 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', padding: '6px 10px', borderBottom: `1px solid ${isDark ? '#475569' : '#e2e8f0'}` }}>
              읽은 사람 ({readersPopup.readers.length})
            </div>
            {readersPopup.readers.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 13, color: isDark ? '#64748b' : '#999' }}>아직 읽은 사람이 없습니다</div>
            ) : (
              readersPopup.readers.map((r) => (
                <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>{r.userName[0]?.toUpperCase()}</span>
                  <span style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b' }}>{r.userName}</span>
                  <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#999', marginLeft: 'auto' }}>{new Date(r.readAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* File drawer panel */}
        {fileDrawerOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setFileDrawerOpen(false)}>
            <div style={{ width: 340, height: '100%', background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>파일함</span>
                <button type="button" onClick={() => setFileDrawerOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: isDark ? '#94a3b8' : '#666', padding: 4 }}>x</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {fileDrawerData.length === 0 ? (
                  <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 14, marginTop: 40 }}>공유된 파일이 없습니다</p>
                ) : (
                  fileDrawerData.map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName || 'file'}</div>
                        <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>
                          {f.sender.name} · {new Date(f.createdAt).toLocaleDateString('ko-KR')}
                          {f.fileSize != null && ` · ${f.fileSize < 1024 * 1024 ? `${(f.fileSize / 1024).toFixed(0)}KB` : `${(f.fileSize / (1024 * 1024)).toFixed(1)}MB`}`}
                        </div>
                      </div>
                      <button type="button" onClick={() => filesApi.download(f.id, f.fileName)} style={{ border: 'none', background: isDark ? '#334155' : '#f1f5f9', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="다운로드">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Thread panel */}
        {threadOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setThreadOpen(null)}>
            <div style={{ width: 380, height: '100%', background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>스레드</span>
                <button type="button" onClick={() => setThreadOpen(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: isDark ? '#94a3b8' : '#666', padding: 4 }}>x</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {/* Parent message */}
                <div style={{ padding: 14, borderRadius: 12, background: isDark ? '#334155' : '#f1f5f9', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>{threadOpen.parent.sender?.name}</div>
                  <div style={{ fontSize: 14, color: isDark ? '#e2e8f0' : '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {threadOpen.parent.content}
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999', marginTop: 6 }}>
                    {new Date(threadOpen.parent.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                {/* Replies */}
                <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 10 }}>
                  답글 {threadOpen.replies.length}개
                </div>
                {threadOpen.replies.map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>
                      {r.sender?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{r.sender?.name}</span>
                        <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>{new Date(r.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: 14, color: isDark ? '#cbd5e1' : '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>
                    </div>
                  </div>
                ))}
                {threadOpen.replies.length === 0 && (
                  <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 13, marginTop: 20 }}>아직 답글이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Style functions for dark mode support
const s = {
  appWrap: (dark: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: dark ? '#0f172a' : '#fff' }),
  layout: (dark: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: dark ? '#0f172a' : '#fafafa', position: 'relative' }),
  loading: (dark: boolean): React.CSSProperties => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? '#94a3b8' : '#5a6b7a', fontSize: 16 }),
  chatHeader: (dark: boolean): React.CSSProperties => ({ padding: '0 20px', height: 56, minHeight: 56, borderBottom: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, background: dark ? '#1e293b' : '#fff', boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }),
  chatHeaderName: (dark: boolean): React.CSSProperties => ({ fontSize: 16, fontWeight: 700, color: dark ? '#f1f5f9' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }),
  headerIconBtn: (dark: boolean): React.CSSProperties => ({ width: 34, height: 34, borderRadius: 8, border: 'none', background: dark ? '#334155' : '#f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }),
  messages: (dark: boolean): React.CSSProperties => ({ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: dark ? '#0f172a' : '#fafafa' }),
  scrollToBottomBtn: (dark: boolean): React.CSSProperties => ({
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: dark ? '#334155' : '#fff',
    color: dark ? '#e2e8f0' : '#475569',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  }),
  dateSeparator: (): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }),
  dateSeparatorText: (): React.CSSProperties => ({ fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '4px 14px', borderRadius: 12 }),
  systemMessageRow: (): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }),
  systemMessageText: (): React.CSSProperties => ({ fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '4px 14px', borderRadius: 12, textAlign: 'center' }),
  messageRow: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', alignSelf: 'flex-start' }),
  messageRowMine: (): React.CSSProperties => ({ alignItems: 'flex-end', alignSelf: 'flex-end' }),
  messageRowInner: (): React.CSSProperties => ({ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '100%' }),
  avatarWrap: (): React.CSSProperties => ({ width: 34, height: 34, flexShrink: 0 }),
  avatarSpacer: (): React.CSSProperties => ({ width: 34, height: 34, flexShrink: 0 }),
  avatarCircle: (dark: boolean): React.CSSProperties => ({ width: 34, height: 34, borderRadius: '50%', background: dark ? '#334155' : '#e2e8f0', color: dark ? '#94a3b8' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }),
  messageBubble: (dark: boolean): React.CSSProperties => ({ maxWidth: '75%', minWidth: 240, padding: '10px 14px', borderRadius: 16, borderTopLeftRadius: 4, background: dark ? '#334155' : '#fff', color: dark ? '#e2e8f0' : '#1e293b', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)' }),
  messageBubbleMine: (dark: boolean): React.CSSProperties => ({ borderTopLeftRadius: 16, borderTopRightRadius: 4, background: dark ? '#475569' : '#475569', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }),
  senderLabel: (dark: boolean): React.CSSProperties => ({ fontSize: 12, color: dark ? '#94a3b8' : '#475569', marginBottom: 4, marginLeft: 42 }),
  metaCol: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, fontSize: 11, color: '#64748b', flexShrink: 0, minWidth: 36 }),
  metaColMine: (): React.CSSProperties => ({ alignItems: 'flex-end' }),
  metaTime: (dark: boolean): React.CSSProperties => ({ fontSize: 11, color: dark ? '#64748b' : '#64748b' }),
  messageContent: (): React.CSSProperties => ({ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.4 }),
  readStatusMine: (dark: boolean): React.CSSProperties => ({ fontSize: 12, fontWeight: 600, color: dark ? '#94a3b8' : '#334155' }),
  replyPreview: (dark: boolean, isMine: boolean): React.CSSProperties => ({
    marginLeft: isMine ? 0 : 42,
    marginBottom: 6,
    padding: '8px 12px',
    borderRadius: 10,
    background: dark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxWidth: '85%',
    overflow: 'hidden',
    boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
    cursor: 'pointer',
  }),
  replyPreviewLabel: (dark: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 600,
    color: dark ? '#94a3b8' : '#64748b',
    letterSpacing: '0.02em',
  }),
  replyPreviewContent: (dark: boolean): React.CSSProperties => ({
    fontSize: 13,
    color: dark ? '#94a3b8' : '#475569',
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  reactionsRow: (isMine: boolean): React.CSSProperties => ({ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: isMine ? 0 : 42, marginTop: 4 }),
  reactionBadge: (dark: boolean, voted: boolean): React.CSSProperties => ({ border: `1px solid ${voted ? (dark ? '#60a5fa' : '#2563eb') : (dark ? '#475569' : '#e5e7eb')}`, borderRadius: 12, padding: '2px 8px', fontSize: 13, background: voted ? (dark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }),
  hoverActionBtn: (dark: boolean): React.CSSProperties => ({ width: 28, height: 28, borderRadius: '50%', border: 'none', background: dark ? '#475569' : '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: dark ? '#94a3b8' : '#555', padding: 0 }),
  ctxMenu: (dark: boolean): React.CSSProperties => ({ position: 'fixed', zIndex: 10000, minWidth: 120, padding: 4, background: dark ? '#334155' : '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: `1px solid ${dark ? '#475569' : '#eee'}` }),
  ctxMenuItem: (dark: boolean): React.CSSProperties => ({ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', borderRadius: 6, fontSize: 13, color: dark ? '#e2e8f0' : '#333', textAlign: 'left', cursor: 'pointer' }),
  searchBar: (dark: boolean): React.CSSProperties => ({ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: `1px solid ${dark ? '#334155' : '#eee'}`, background: dark ? '#1e293b' : '#fff' }),
  searchInput: (dark: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 12px', border: `1px solid ${dark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 13, background: dark ? '#334155' : '#f5f5f5', color: dark ? '#e2e8f0' : '#333', outline: 'none' }),
  searchBtn: (_dark: boolean): React.CSSProperties => ({ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, cursor: 'pointer' }),
  searchCloseBtn: (dark: boolean): React.CSSProperties => ({ padding: '8px 10px', border: 'none', borderRadius: 8, background: dark ? '#334155' : '#f0f0f0', color: dark ? '#94a3b8' : '#666', cursor: 'pointer', fontSize: 14 }),
  searchResults: (dark: boolean): React.CSSProperties => ({ maxHeight: 200, overflow: 'auto', borderBottom: `1px solid ${dark ? '#334155' : '#eee'}`, background: dark ? '#1e293b' : '#fff' }),
  searchResultItem: (dark: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${dark ? '#334155' : '#f0f0f0'}`, fontSize: 13 }),
  replyIndicator: (dark: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: `1px solid ${dark ? '#334155' : '#eee'}`, background: dark ? '#1e293b' : '#f8fafc' }),
  inputRow: (dark: boolean): React.CSSProperties => ({ padding: '10px 16px 14px', display: 'flex', gap: 8, alignItems: 'center', background: dark ? '#1e293b' : '#fff', borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }),
  plusWrap: (): React.CSSProperties => ({ position: 'relative', flexShrink: 0 }),
  plusBtn: (dark: boolean): React.CSSProperties => ({ width: 36, height: 36, borderRadius: 10, border: 'none', background: dark ? '#334155' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569', fontSize: 20, lineHeight: '36px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.15s' }),
  plusMenu: (dark: boolean): React.CSSProperties => ({ position: 'absolute', bottom: 48, left: 0, background: dark ? '#334155' : '#fff', border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`, borderRadius: 12, boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.3)' : '0 6px 24px rgba(0,0,0,0.1)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150, zIndex: 50 }),
  plusMenuItem: (dark: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', borderRadius: 8, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: dark ? '#e2e8f0' : '#334155', transition: 'background 0.1s' }),
  input: (dark: boolean): React.CSSProperties => ({ flex: 1, padding: '10px 18px', border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`, borderRadius: 20, fontSize: 14, background: dark ? '#0f172a' : '#f8fafc', color: dark ? '#e2e8f0' : '#1e293b', outline: 'none', transition: 'border-color 0.15s' }),
  sendBtn: (_dark: boolean): React.CSSProperties => ({ padding: '10px 20px', background: '#475569', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'background 0.15s' }),
  dropOverlay: (): React.CSSProperties => ({ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }),
  dropContent: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }),
  dropText: (): React.CSSProperties => ({ color: '#fff', fontSize: 16, fontWeight: 600 }),
  shareEventOverlay: (): React.CSSProperties => ({ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  shareEventModal: (dark: boolean): React.CSSProperties => ({ background: dark ? '#1e293b' : '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%', maxHeight: '70vh', overflow: 'auto', padding: 20 }),
};
