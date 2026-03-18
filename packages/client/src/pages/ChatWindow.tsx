import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore, useToastStore } from '../store';
import { roomsApi, filesApi, eventsApi, pollsApi, projectsApi, bookmarksApi, type Room, type Message, type FileInfo } from '../api';
import { ollamaSummarize } from '../ollama';
import FileUploadButton from '../components/FileUploadButton';
import InviteModal from '../components/InviteModal';
import RoomSettingsModal from '../components/RoomSettingsModal';
import PollCreateModal from '../components/PollCreateModal';
import ForwardModal from '../components/ForwardModal';
import MentionPopup from '../components/MentionPopup';
import PinnedMessages from '../components/PinnedMessages';
import TaskCreateModal from '../components/TaskCreateModal';
import TitleBar from '../components/TitleBar';
import ContextAttachModal, { type MessageContext } from '../components/ContextAttachModal';
import UICloseButton from '../components/ui/UICloseButton';
import {
  canEditOrDelete,
  isSystemMessage,
} from './chat-window/utils';
import { useChatSocket } from './chat-window/hooks/useChatSocket';
import { useActiveChatPresence } from './chat-window/hooks/useActiveChatPresence';
import { chatWindowStyles } from './chat-window/styles';
import ChatBubbleList from './chat-window/components/ChatBubbleList';
import BoardMessageList from './chat-window/components/BoardMessageList';
import ThreadPanel from './chat-window/components/ThreadPanel';
import RightSidebar from './chat-window/components/RightSidebar';

const MAX_DROP_SIZE = 2 * 1024 * 1024 * 1024;
const SCROLL_BOTTOM_THRESHOLD = 80;
const RIGHT_SIDEBAR_PANEL_WIDTH = 280;
const RIGHT_SIDEBAR_ICON_WIDTH = 48;

const s = chatWindowStyles;

type ChatWindowProps = { embedded?: boolean; onOpenInNewWindow?: () => void };

export default function ChatWindow({ embedded, onOpenInNewWindow }: ChatWindowProps = {}) {
  const { roomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
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
  const [threadOpen, setThreadOpen] = useState<{ parentId: string; parent: Message; replies: Message[] } | null>(null);
  const [fileDrawerData, setFileDrawerData] = useState<FileInfo[]>([]);
  const [rightPanel, setRightPanel] = useState<'none' | 'file' | 'members' | 'pins'>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [messageContext, setMessageContext] = useState<MessageContext | null>(null);
  useEffect(() => {
    setRightPanel('none');
  }, [roomId]);
  const [boardCommentInputs, setBoardCommentInputs] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const isCompactHeader = viewportWidth < 980;
  const summaryDismissedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevPageCountRef = useRef(0);
  const prevMsgCountRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
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

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data: roomsList = [] } = useQuery({
    queryKey: ['rooms', myId],
    queryFn: roomsApi.list,
    enabled: !!myId && !!roomId,
  });

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['rooms', roomId],
    queryFn: async () => {
      if (!roomId) return Promise.reject(new Error('no roomId'));
      // list를 먼저 로드해 viewMode 동기화 (보드뷰가 챗뷰로 보이는 문제 방지)
      const list = myId
        ? await queryClient.ensureQueryData<Room[]>({ queryKey: ['rooms', myId], queryFn: roomsApi.list, staleTime: 0 })
        : queryClient.getQueryData<Room[]>(['rooms', myId]);
      const data = await roomsApi.get(roomId);
      const fromList = list?.find((r) => r.id === roomId)?.viewMode;
      const apiViewMode = (data as Room).viewMode;
      if (fromList === 'board' && apiViewMode !== 'board') {
        return { ...data, viewMode: 'board' as const } as Room;
      }
      return data as Room;
    },
    enabled: !!roomId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  useChatSocket({
    token,
    roomId,
    embedded,
    room,
    myId,
    socketRef,
    setSocket,
    queryClient,
  });

  type MessagesPage = { messages: Message[]; nextCursor: string | null; hasMore: boolean };

  const {
    data: messagesInfinite,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['rooms', roomId, 'messages'],
    queryFn: ({ pageParam }) => (roomId ? roomsApi.messages(roomId, pageParam as string | undefined) : Promise.resolve({ messages: [], nextCursor: null, hasMore: false })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: MessagesPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!roomId,
  });
  const { data: myEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
    enabled: !!token && !!shareEventOpen,
  });
  const messages = useMemo(
    () => (messagesInfinite?.pages ?? []).flatMap((p) => (p?.messages ?? []).filter(Boolean)),
    [messagesInfinite]
  );

  const handleLoadMore = () => {
    if (messagesScrollRef.current) {
      prevScrollHeightRef.current = messagesScrollRef.current.scrollHeight;
    }
    fetchNextPage();
  };

  const viewModeFromListNow = roomId ? roomsList.find((r) => r.id === roomId)?.viewMode : undefined;
  useEffect(() => {
    if (roomId && room && viewModeFromListNow === 'board' && room?.viewMode !== 'board') {
      queryClient.setQueryData(['rooms', roomId], { ...room, viewMode: 'board' as const });
    }
  }, [roomId, room, viewModeFromListNow, queryClient]);

  useEffect(() => {
    const t = setTimeout(checkAtBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length, roomId]);

  // 스크롤 상단 sentinel - 이전 메시지 로드
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage]);

  // 이전 페이지 로드 완료 시 스크롤 위치 보정
  useEffect(() => {
    const pageCount = messagesInfinite?.pages?.length ?? 0;
    if (pageCount > prevPageCountRef.current && prevPageCountRef.current > 0) {
      const el = messagesScrollRef.current;
      if (el) {
        const diff = el.scrollHeight - prevScrollHeightRef.current;
        el.scrollTop += diff;
      }
    }
    prevPageCountRef.current = pageCount;
  }, [messagesInfinite?.pages.length]);

  // 채팅창이 열리면 입력 칸에 포커스
  useEffect(() => {
    if (!roomId || !room) return;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [roomId, room]);

  useEffect(() => {
    if (roomId) {
      roomsApi.markRead(roomId).then(() => {
        queryClient.refetchQueries({ queryKey: ['rooms'] });
        queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
      }).catch((err) => {
        console.warn('[markRead] 읽음 처리 실패:', err.message);
      });
    }
  }, [roomId, queryClient]);
  useActiveChatPresence(roomId);

  // roomId 변경 시 초기 스크롤 플래그 리셋
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [roomId]);

  // 첫 번째 안 읽은 메시지 ID (useEffect보다 먼저 선언 필요)
  const displayMessagesForScroll = useMemo(() => [...messages].reverse(), [messages]);
  const firstUnreadMessageId = useMemo(() => {
    if (!room) return null;
    const lastReadAt = room?.lastReadAt ? new Date(room.lastReadAt).getTime() : 0;
    const unreadCount = room?.unreadCount ?? 0;
    if (unreadCount <= 0 || lastReadAt <= 0) return null;
    return displayMessagesForScroll.find((m) => m.senderId !== myId && new Date(m.createdAt).getTime() > lastReadAt)?.id ?? null;
  }, [room, myId, displayMessagesForScroll]);

  // 채팅 열릴 때: 다읽음→맨끝, 안읽음→첫 안읽은 메시지로 스크롤
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !room) return;
    const curCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = curCount;

    // 이전 메시지 로드(페이지 추가)일 때는 스크롤 금지 - 위 useEffect에서 보정함
    const pageCount = messagesInfinite?.pages?.length ?? 0;
    if (pageCount > 1 && curCount > prevCount && curCount - prevCount >= 10) return;

    // 초기 로드 시에만 진입 스크롤 (room + messages 준비 후)
    if (curCount > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      const run = () => {
        if (firstUnreadMessageId && firstUnreadRef.current) {
          firstUnreadRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else {
          el.scrollTop = el.scrollHeight;
        }
      };
      requestAnimationFrame(run);
      const t = setTimeout(run, 250);
      return () => clearTimeout(t);
    }

    // 새 메시지 추가 시: 맨 아래에 있거나, 내가 보낸 메시지면 맨 끝으로 스크롤
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
    const newestIsMine = messages[0]?.senderId === myId;
    const shouldScroll = (atBottom || newestIsMine) && prevCount > 0;
    if (shouldScroll) {
      const run = () => { el.scrollTop = el.scrollHeight; };
      requestAnimationFrame(run);
      const t = setTimeout(run, 150);
      return () => clearTimeout(t);
    }
  }, [messages.length, room, firstUnreadMessageId, messages, myId]);

  // 요약 표시 시 맨 아래로 스크롤
  useEffect(() => {
    if (!summaryText && !summaryLoading) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => { el.scrollTop = el.scrollHeight; };
    requestAnimationFrame(run);
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [summaryText, summaryLoading]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const t = setTimeout(() => document.addEventListener('click', close), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [contextMenu]);

  const sendMessage = async () => {
    const text = input.trim();

    if (editingMsg) {
      if (!text || !roomId) return;
      roomsApi.editMessage(roomId, editingMsg.id, text).then(() => {
        setEditingMsg(null);
        setInput('');
      }).catch(console.error);
      return;
    }

    // 파일 + 메시지 전송
    if (pendingFiles.length > 0) {
      if (!roomId) return;
      setFileUploading(true);
      try {
        for (let i = 0; i < pendingFiles.length; i++) {
          const content = (i === 0 && text) ? text : undefined;
          await filesApi.upload(roomId, pendingFiles[i], (pct) => {
            setFileUploadProgress(((i / pendingFiles.length) + (pct / 100 / pendingFiles.length)) * 100);
          }, content);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setFileUploading(false);
        setFileUploadProgress(0);
      }
      setPendingFiles([]);
      setInput('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      return;
    }

    // 텍스트만 전송 (socketRef 사용 - stale closure 방지)
    const s = socketRef.current;
    if (!text || !roomId || !s) return;
    const payload: { roomId: string; content: string; replyToId?: string; context?: { filePath?: string; line?: number; branch?: string } } = {
      roomId,
      content: text,
      replyToId: replyTo?.id || undefined,
    };
    if (messageContext && (messageContext.filePath || messageContext.branch)) {
      payload.context = {
        filePath: messageContext.filePath || undefined,
        line: messageContext.line > 0 ? messageContext.line : undefined,
        branch: messageContext.branch || undefined,
      };
    }
    s.emit('message', payload);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setInput('');
    setReplyTo(null);
    setMessageContext(null);
  };

  const handleSearch = async () => {
    if (!roomId || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const res = await roomsApi.searchMessages(roomId, searchQuery.trim());
      setSearchResults(res.messages);
    } catch { setSearchResults([]); }
  };

  const handleSummarize = async () => {
    const msgList = [...messages].reverse();
    const chatText = msgList
      .filter((m: Message) => !m.deletedAt && !isSystemMessage(m.content) && (m.content || m.fileUrl))
      .map((m: Message) => {
        const name = m.sender?.name ?? '알 수 없음';
        const body = m.content || (m.fileUrl ? '(파일)' : '');
        return `[${name}] ${body}`;
      })
      .join('\n');
    if (!chatText.trim()) {
      setSummaryText('요약할 채팅 내용이 없습니다.');
      return;
    }
    setSummaryLoading(true);
    setSummaryText('');
    summaryDismissedRef.current = false;
    try {
      const summary = await ollamaSummarize(chatText);
      if (!summaryDismissedRef.current) {
        setSummaryText(summary || '요약할 내용이 없습니다.');
      }
    } catch (err) {
      if (!summaryDismissedRef.current) {
        setSummaryText(`오류: ${(err as Error).message}`);
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0 || fileUploading) return;
    const valid = droppedFiles.filter((f) => f.size <= MAX_DROP_SIZE);
    if (valid.length > 0) setPendingFiles((prev) => [...prev, ...valid]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (fileUploading) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    let file: File | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        file = item.getAsFile();
        break;
      }
    }
    if (!file) return;
    e.preventDefault();
    if (file.size > MAX_DROP_SIZE) return;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'png';
    const namedFile = new File([file], `image-${Date.now()}.${ext}`, { type: file.type });
    setPendingFiles((prev) => [...prev, namedFile]);
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
    }).catch((err) => {
      console.warn('[bookmarks] 북마크 목록 로드 실패:', err.message);
    });
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
    const isClosing = rightPanel === 'file';
    if (isClosing) {
      setRightPanel('none');
      return;
    }
    try {
      const { files } = await roomsApi.files(roomId);
      setFileDrawerData(files);
      setRightPanel('file');
    } catch (err) {
      console.error(err);
    }
  };

  const viewModeFromState = (location.state as { viewMode?: 'chat' | 'board' })?.viewMode;
  const isBoardView = room?.viewMode === 'board' || viewModeFromListNow === 'board' || viewModeFromState === 'board';

  // 보드뷰: 루트 포스트와 댓글(reply) 분리 - 훅은 early return 전에 호출
  const { rootPosts, repliesMap } = useMemo(() => {
    if (!isBoardView) return { rootPosts: [] as Message[], repliesMap: new Map<string, Message[]>() };
    const reversed = [...messages].reverse();
    const map = new Map<string, Message[]>();
    const roots: Message[] = [];
    for (const m of reversed) {
      if (m.replyToId) {
        const arr = map.get(m.replyToId) || [];
        arr.push(m);
        map.set(m.replyToId, arr);
      } else {
        roots.push(m);
      }
    }
    return { rootPosts: roots, repliesMap: map };
  }, [messages, isBoardView]);

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

  const displayMessages = displayMessagesForScroll;
  const hasElectron = !!window.electronAPI;
  const members = room?.members ?? [];
  const isCreator = !!(room?.isTopic && room?.createdBy && room.createdBy === myId);
  const canInvite = !room?.isTopic || isCreator;

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
        @keyframes unread-divider-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      {!embedded && hasElectron && <TitleBar title={room.name} isDark={isDark} />}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={embedded ? { ...s.layout(isDark), flex: 1, minHeight: 0, minWidth: 0 } : { ...s.layout(isDark), flex: 1, minWidth: 0 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {dragOver && (
          <div style={s.dropOverlay()}>
            <div style={s.dropContent()}>
              <span style={s.dropText()}>파일을 여기에 놓으세요</span>
            </div>
          </div>
        )}
        <header style={s.chatHeader(isDark, isCompactHeader)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0 }}>
            <span style={s.chatHeaderName(isDark)}>{room.name}</span>
            {isBoardView && (
              <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', padding: '2px 8px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', flexShrink: 0 }}>보드뷰</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: isCompactHeader ? 'wrap' : 'nowrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
            {embedded && onOpenInNewWindow && (
              <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={onOpenInNewWindow} title="새 창으로 열기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
            <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={() => setSearchOpen(!searchOpen)} title="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={handleSummarize} title="채팅 요약" disabled={summaryLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={() => {
              if (window.electronAPI?.openKanbanWindow) {
                window.electronAPI.openKanbanWindow(roomId!);
              } else {
                window.open(`${window.location.origin}/kanban/${roomId}`, '_blank', 'width=1100,height=750');
              }
            }} title="프로젝트 보드">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="10" rx="1" />
              </svg>
            </button>
            {isCreator && (
              <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={() => setSettingsOpen(true)} title="방 설정">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
            )}
            {canInvite && (
            <button type="button" style={s.headerIconBtn(isDark, isCompactHeader)} onClick={() => setInviteOpen(true)} title="멤버 초대">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </button>
            )}
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
            <UICloseButton
              size="md"
              variant="subtle"
              onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery(''); }}
              style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: 8 }}
            />
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

        {contextOpen && (
          <ContextAttachModal
            initialContext={messageContext}
            onClose={() => setContextOpen(false)}
            onConfirm={(ctx) => { setMessageContext(ctx); setContextOpen(false); }}
          />
        )}
        {inviteOpen && room && (
          <InviteModal
            roomId={roomId!}
            currentMemberIds={members.map((m: { id: string }) => m.id)}
            onClose={() => setInviteOpen(false)}
            onInvited={(newRoomId: string) => {
              queryClient.refetchQueries({ queryKey: ['rooms'] });
              if (window.electronAPI?.openChatWindow) {
                window.electronAPI.openChatWindow(newRoomId);
              } else {
                window.open(`${window.location.origin}/chat/${newRoomId}`, '_blank', 'width=480,height=680');
              }
            }}
          />
        )}

        {settingsOpen && room && (
          <RoomSettingsModal
            room={room}
            onClose={() => setSettingsOpen(false)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['rooms'] });
              queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
              setSettingsOpen(false);
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
          <div ref={topSentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && (
            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: isDark ? '#64748b' : '#94a3b8' }}>
              이전 메시지 불러오는 중...
            </div>
          )}
          {isBoardView ? (
            <BoardMessageList
              rootPosts={rootPosts}
              repliesMap={repliesMap}
              isDark={isDark}
              myId={myId}
              room={room}
              setContextMenu={setContextMenu}
              showToast={showToast}
              handleReaction={handleReaction}
              boardCommentInputs={boardCommentInputs}
              setBoardCommentInputs={setBoardCommentInputs}
              socketRef={socketRef}
              roomId={roomId}
            />
          )

          /* ===== 채팅뷰: 기존 말풍선 ===== */
          : (
            <ChatBubbleList
              displayMessages={displayMessages}
              firstUnreadMessageId={firstUnreadMessageId}
              firstUnreadRef={firstUnreadRef}
              isDark={isDark}
              myId={myId}
              room={room}
              hoveredMsg={hoveredMsg}
              highlightedMsgId={highlightedMsgId}
              emojiPickerMsg={emojiPickerMsg}
              setHoveredMsg={setHoveredMsg}
              setHighlightedMsgId={setHighlightedMsgId}
              setContextMenu={setContextMenu}
              showToast={showToast}
              setReplyTo={setReplyTo}
              setEmojiPickerMsg={setEmojiPickerMsg}
              handleReaction={handleReaction}
            />
          )}

          {/* AI 채팅 요약 (채팅 메시지 형태) */}
          {(summaryLoading || summaryText) && (
            <div style={s.messageRow()}>
              <div style={s.senderLabel(isDark)}>AI 요약</div>
              <div style={s.messageRowInner()}>
                <div style={s.avatarWrap()} aria-hidden>
                  <span style={{ ...s.avatarCircle(isDark), background: isDark ? '#171717' : '#171717', color: '#fff' }}>AI</span>
                </div>
                <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                  <div
                    style={{
                      ...s.messageBubble(isDark),
                      background: isDark ? '#334155' : '#e8f5e9',
                      border: `1px solid ${isDark ? '#475569' : '#c8e6c9'}`,
                      maxWidth: '75%',
                      minWidth: 200,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
                      <UICloseButton
                        size="sm"
                        onClick={() => { summaryDismissedRef.current = true; setSummaryText(''); setSummaryLoading(false); }}
                        title="닫기"
                      />
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: isDark ? '#e2e8f0' : '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {summaryLoading ? '요약 중...' : summaryText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      if (window.electronAPI?.openKanbanWindow) {
                        window.electronAPI.openKanbanWindow(roomId!);
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
                        if (!socketRef.current || !roomId) return;
                        socketRef.current.emit('message', { roomId, content: '', sharedEvent: { title: ev.title, startAt: ev.startAt, endAt: ev.endAt, description: ev.description ?? '' } });
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
            <UICloseButton size="sm" onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }} />
          </div>
        )}

        {/* Mention popup */}
        <div style={{ position: 'relative' }}>
          {mentionQuery !== null && (
            <MentionPopup members={members} query={mentionQuery} onSelect={handleMentionSelect} />
          )}
        </div>

        {/* 첨부 파일 프리뷰 바 */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px', background: isDark ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
            {pendingFiles.map((f, idx) => {
              const isImage = f.type.startsWith('image/');
              const sizeStr = f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / (1024 * 1024)).toFixed(1)}MB`;
              return (
                <div key={`${f.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: isDark ? '#334155' : '#e2e8f0', maxWidth: 260 }}>
                  {isImage ? (
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>{sizeStr}</div>
                  </div>
                  <UICloseButton
                    size="sm"
                    aria-label="첨부 파일 제거"
                    title="첨부 파일 제거"
                    style={{ color: isDark ? '#94a3b8' : '#888' }}
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* 업로드 프로그레스 바 */}
        {fileUploading && (
          <div style={{ padding: '0 16px 4px', background: isDark ? '#1e293b' : '#f8fafc' }}>
            <div style={{ height: 4, borderRadius: 2, background: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fileUploadProgress}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999', marginTop: 2 }}>업로드 중 {Math.round(fileUploadProgress)}%</div>
          </div>
        )}

        {messageContext && (messageContext.filePath || messageContext.branch) && (
          <div style={{ padding: '6px 16px 4px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 8,
                background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
                color: isDark ? '#a5b4fc' : '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📍 {[messageContext.filePath, messageContext.line > 0 ? `:${messageContext.line}` : null, messageContext.branch ? ` (${messageContext.branch})` : null].filter(Boolean).join('')}
              <UICloseButton
                size="sm"
                aria-label="제거"
                title="제거"
                style={{ opacity: 0.8 }}
                onClick={() => setMessageContext(null)}
              />
            </span>
          </div>
        )}
        <div style={s.inputRow(isDark)}>
          <div style={s.inputRowLeft()}>
            <div style={s.plusWrap()}>
              <button
                type="button"
                style={s.plusBtn(isDark)}
                onClick={() => setActionsOpen((v) => !v)}
                disabled={!socket}
                title="추가 액션"
              >
                +
              </button>
              {actionsOpen && (
                <div style={s.plusMenu(isDark)}>
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setContextOpen(true);
                    }}
                  >
                    코드 위치 첨부
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: isDark ? '#475569' : '#eef2f7',
                      margin: '2px 0',
                    }}
                  />
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setShareEventOpen(true);
                    }}
                  >
                    일정 공유
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: isDark ? '#475569' : '#eef2f7',
                      margin: '2px 0',
                    }}
                  />
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setPollCreateOpen(true);
                    }}
                  >
                    투표 만들기
                  </button>
                </div>
              )}
            </div>
            <FileUploadButton
              disabled={!socket || fileUploading}
              onFileSelected={(files) =>
                setPendingFiles((prev) => [...prev, ...files])
              }
            />
          </div>
          <div style={s.inputRowCenter()}>
            <textarea
              ref={inputRef}
              placeholder="메시지를 입력하세요"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              style={s.input(isDark)}
            />
          </div>
          <div style={s.inputRowRight()}>
            <button
              type="button"
              onClick={sendMessage}
              style={s.sendBtn(isDark, !input.trim() || !socket || fileUploading)}
              disabled={!input.trim() || !socket || fileUploading}
            >
              {editingMsg ? '수정' : '전송'}
            </button>
          </div>
        </div>

        <ThreadPanel threadOpen={threadOpen} setThreadOpen={setThreadOpen} isDark={isDark} />
        </div>

        <RightSidebar
          isDark={isDark}
          rightPanel={rightPanel}
          setRightPanel={setRightPanel}
          handleOpenFileDrawer={handleOpenFileDrawer}
          fileDrawerData={fileDrawerData}
          canInvite={canInvite}
          setInviteOpen={setInviteOpen}
          roomId={roomId}
          members={members}
          panelWidth={RIGHT_SIDEBAR_PANEL_WIDTH}
          iconWidth={RIGHT_SIDEBAR_ICON_WIDTH}
        />
      </div>
    </div>
  );
}
