import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, roomsApi, foldersApi, type User, type Folder, type Room } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import UserAvatar from './UserAvatar';
import UICloseButton from './ui/UICloseButton';
import { cn } from '../utils/cn';

type Props = {
  mode: 'topic' | 'chat';
  onClose: () => void;
  onCreated: (roomId: string, viewMode?: 'chat' | 'board', options?: { skipRoomsInvalidate?: boolean }) => void;
  onTopicCreated?: (roomId: string) => void;
};

export default function CreateGroupModal({ mode, onClose, onCreated, onTopicCreated }: Props) {
  const [step, setStep] = useState<'form' | 'members'>(mode === 'topic' ? 'form' : 'members');
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'board'>('chat');
  const [folderId, setFolderId] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formSnapshot, setFormSnapshot] = useState<{ folderId: string; viewMode: 'chat' | 'board' } | null>(null);
  const [editingAvatarUserId, setEditingAvatarUserId] = useState<string | null>(null);
  const [customInitials, setCustomInitials] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('emax_user_initials');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch { return {}; }
  });
  const isDark = useThemeStore((s) => s.isDark);
  const myId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.list,
    enabled: mode === 'topic',
  });

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const saveCustomInitials = (userId: string, value: string) => {
    const trimmed = value.trim().slice(0, 2).toUpperCase();
    setCustomInitials((prev) => {
      const next = { ...prev };
      if (trimmed) next[userId] = trimmed;
      else delete next[userId];
      try { localStorage.setItem('emax_user_initials', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setEditingAvatarUserId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setError(null);
    try {
      const folder = await foldersApi.create(newFolderName.trim());
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setFolderId(folder.id);
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 생성 실패');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'topic') {
        if (!topicName.trim()) {
          setError('아젠다 이름을 입력해주세요');
          setLoading(false);
          return;
        }
        const snap = formSnapshot ?? { folderId, viewMode };
        const payload: { name: string; description?: string; isPublic: boolean; viewMode: string; memberIds: string[]; folderId?: string; initials?: string } = {
          name: topicName.trim(),
          description: topicDesc.trim() || undefined,
          isPublic,
          viewMode: snap.viewMode || 'chat',
          memberIds: Array.from(selected),
        };
        const trimmedInitials = topicName.trim().slice(0, 2).toUpperCase();
        if (trimmedInitials) payload.initials = trimmedInitials;
        const trimmedFolderId = snap.folderId ? String(snap.folderId).trim() : '';
        if (trimmedFolderId) payload.folderId = trimmedFolderId;
        if (import.meta.env.DEV) console.log('[CreateGroupModal] sending:', payload);
        const room = await roomsApi.createTopic(payload);
        const viewModeToUse = (room as { viewMode?: string })?.viewMode ?? snap.viewMode ?? viewMode;
        const folderIdFromServer = (room as { folderId?: string | null })?.folderId ?? (trimmedFolderId || null);
        const initialsFromServer = (room as { initials?: string | null })?.initials ?? (trimmedInitials || null);
        const newRoomData = {
          id: room.id,
          name: room.name,
          avatarUrl: null,
          initials: initialsFromServer,
          isGroup: room.isGroup,
          isTopic: (room as { isTopic?: boolean })?.isTopic ?? (mode === 'topic'),
          viewMode: viewModeToUse,
          members: room.members ?? [],
          updatedAt: room.updatedAt,
          lastMessage: null,
          folderId: folderIdFromServer,
          isFavorite: (room as { isFavorite?: boolean })?.isFavorite ?? false,
          unreadCount: 0,
          createdBy: (room as { createdBy?: string | null })?.createdBy ?? null,
        };
        queryClient.setQueryData(['rooms', room.id], newRoomData);
        // 아젠다: invalidate 없이 setQueryData만 사용 (refetch가 isTopic을 덮어쓰는 문제 방지)
        if (myId) {
          const roomToAdd = { ...newRoomData, lastMessage: null, unreadCount: 0, isTopic: true, isGroup: true } as Room;
          queryClient.setQueryData<Room[]>(['rooms', myId], (prev) => {
            if (!prev) return [roomToAdd];
            if (prev.some((r) => r.id === room.id)) {
              return prev.map((r) => (r.id === room.id ? { ...r, ...roomToAdd, isTopic: true, isGroup: true } : r));
            }
            return [roomToAdd, ...prev];
          });
        }
        onTopicCreated?.(room.id);
        const normalizedViewMode: 'chat' | 'board' = viewModeToUse === 'board' ? 'board' : 'chat';
        onCreated(room.id, normalizedViewMode, { skipRoomsInvalidate: true });
      } else {
        const ids = Array.from(selected);
        if (ids.length === 0) { setLoading(false); return; }
        if (ids.length === 1) {
          const room = await roomsApi.create(ids[0]);
          onCreated(room.id);
        } else {
          const firstRoom = await roomsApi.create(ids[0]);
          const groupRoom = await roomsApi.addMembers(firstRoom.id, ids.slice(1));
          if (groupRoom?.id && Array.isArray(groupRoom.members)) {
            queryClient.setQueryData(['rooms', groupRoom.id], groupRoom);
          }
          onCreated(groupRoom.id);
        }
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) console.error('[CreateGroupModal] create error:', err);
      setError(msg || '만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  const isTopic = mode === 'topic';
  const title = isTopic ? '새 아젠다 생성' : '새 채팅';
  const canCreate = isTopic ? topicName.trim().length > 0 : selected.size > 0;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div
        className={cn(
          'rounded-xl border flex flex-col w-[460px] max-w-[95vw] max-h-[85vh]',
          isDark
            ? 'bg-[#1e293b] border-[#475569] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-white border-[#e2e8f0] shadow-[0_8px_32px_rgba(0,0,0,0.15)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-5 py-4 border-b shrink-0', isDark ? 'border-[#475569]' : 'border-[#e2e8f0]')}>
          <h3 className={cn('m-0 text-lg font-semibold', isDark ? 'text-white' : 'text-[#020617]')}>{title}</h3>
          <UICloseButton onClick={onClose} />
        </div>

        {/* Topic Form Step */}
        {isTopic && step === 'form' && (
          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            {/* Name */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>이름 <span className="text-red-500 ml-0.5">*</span></label>
                <span className={cn('text-[11px]', topicName.length > 60 ? 'text-red-500' : (isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'))}>{topicName.length}/60</span>
              </div>
              <input
                type="text"
                placeholder="아젠다 이름을 입력하세요"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value.slice(0, 60))}
                maxLength={60}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm outline-none box-border transition-colors focus:border-brand-dark',
                  isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0] placeholder:text-slate-500' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#0f172a] placeholder:text-slate-400'
                )}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>아젠다 설명</label>
                <span className={cn('text-[11px]', topicDesc.length > 300 ? 'text-red-500' : (isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'))}>{topicDesc.length}/300</span>
              </div>
              <textarea
                placeholder="아젠다에 대한 설명을 입력하세요 (선택)"
                value={topicDesc}
                onChange={(e) => setTopicDesc(e.target.value.slice(0, 300))}
                maxLength={300}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm outline-none box-border resize-y leading-normal transition-colors focus:border-brand-dark',
                  isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0] placeholder:text-slate-500' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#0f172a] placeholder:text-slate-400'
                )}
                rows={3}
              />
            </div>

            {/* Public/Private */}
            <div className="mb-4">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>공개 여부</label>
              <div className="flex gap-2.5 mt-1">
                <label
                  className={cn(
                    'flex items-start gap-2 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border transition-colors',
                    isPublic ? (isDark ? 'border-brand-dark bg-brand-dark/12' : 'border-brand-dark bg-brand-dark/10') : (isDark ? 'border-[#475569] bg-[#334155]' : 'border-[#e2e8f0] bg-[#f1f5f9]')
                  )}
                >
                  <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('text-base shrink-0 mt-px', isPublic ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-[#64748b]' : 'text-[#94a3b8]'))}>{isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>공개</div>
                    <div className={cn('text-[11px] mt-0.5', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>누구나 검색하여 참가 가능</div>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex items-start gap-2 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border transition-colors',
                    !isPublic ? (isDark ? 'border-brand-dark bg-brand-dark/12' : 'border-brand-dark bg-brand-dark/10') : (isDark ? 'border-[#475569] bg-[#334155]' : 'border-[#e2e8f0] bg-[#f1f5f9]')
                  )}
                >
                  <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('text-base shrink-0 mt-px', !isPublic ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-[#64748b]' : 'text-[#94a3b8]'))}>{!isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>비공개</div>
                    <div className={cn('text-[11px] mt-0.5', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>초대된 멤버만 참가 가능</div>
                  </div>
                </label>
              </div>
              <p className={cn('mt-1.5 text-[11px] italic', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>아젠다 생성 이후 변경 불가</p>
            </div>

            {/* View Mode: 챗뷰(메시지 기반) vs 보드뷰(게시글 기반) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>보기 방식 <span className="text-red-500 ml-0.5">*</span></label>
                <span className={cn('text-[11px] font-medium', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>아젠다 생성 이후 변경 불가</span>
              </div>
              <div className="flex gap-2.5 mt-1">
                <label
                  className={cn(
                    'flex flex-col items-center gap-1.5 cursor-pointer flex-1 pt-3.5 px-3 pb-2.5 rounded-lg border-2 text-center transition-colors',
                    viewMode === 'chat' ? (isDark ? 'border-brand-dark bg-brand-dark/12' : 'border-brand-dark bg-brand-dark/10') : (isDark ? 'border-[#475569] bg-[#334155]' : 'border-[#e2e8f0] bg-[#f1f5f9]')
                  )}
                >
                  <input type="radio" name="viewMode" checked={viewMode === 'chat'} onChange={() => setViewMode('chat')} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('flex items-center justify-center', viewMode === 'chat' ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-slate-400' : 'text-slate-500'))}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className={cn('text-base', viewMode === 'chat' ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-[#64748b]' : 'text-[#94a3b8]'))}>{viewMode === 'chat' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span className={cn('text-xs font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>챗뷰</span>
                    <div className={cn('text-[10px] mt-0.5 leading-tight', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>메시지 기반 · 빠른 대화·실시간 논의</div>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex flex-col items-center gap-1.5 cursor-pointer flex-1 pt-3.5 px-3 pb-2.5 rounded-lg border-2 text-center transition-colors',
                    viewMode === 'board' ? (isDark ? 'border-brand-dark bg-brand-dark/12' : 'border-brand-dark bg-brand-dark/10') : (isDark ? 'border-[#475569] bg-[#334155]' : 'border-[#e2e8f0] bg-[#f1f5f9]')
                  )}
                >
                  <input type="radio" name="viewMode" checked={viewMode === 'board'} onChange={() => setViewMode('board')} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('flex items-center justify-center', viewMode === 'board' ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-slate-400' : 'text-slate-500'))}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className={cn('text-base', viewMode === 'board' ? (isDark ? 'text-brand-light' : 'text-brand-dark') : (isDark ? 'text-[#64748b]' : 'text-[#94a3b8]'))}>{viewMode === 'board' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span className={cn('text-xs font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>보드뷰</span>
                    <div className={cn('text-[10px] mt-0.5 leading-tight', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>게시글 기반 · 공지·회의록·장문 기록</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Folder Selection */}
            <div className="mb-4">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>폴더 선택 (옵션)</label>
              <div className="flex gap-2 items-center mt-1">
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className={cn(
                    'flex-1 px-3 py-[9px] border rounded-lg text-[13px] outline-none cursor-pointer transition-colors focus:border-brand-dark',
                    isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0]' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#0f172a]'
                  )}
                >
                  <option value="">아젠다를 생성할 폴더를 선택해 주세요.</option>
                  {(folders as Folder[]).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={cn(
                    'w-[34px] h-[34px] rounded-lg border flex items-center justify-center text-lg cursor-pointer shrink-0 transition-colors',
                    isDark ? 'border-[#475569] bg-[#334155] text-[#94a3b8] hover:bg-[#475569] hover:text-brand-light' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-brand-dark'
                  )}
                  onClick={() => setShowNewFolder(!showNewFolder)}
                  title="새 폴더 만들기"
                >+</button>
              </div>
              {showNewFolder && (
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    type="text"
                    placeholder="새 폴더 이름"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    className={cn(
                      'flex-1 w-full px-3 py-2.5 border rounded-lg text-sm outline-none box-border',
                      isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0]' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#0f172a]'
                    )}
                  />
                  <button
                    type="button"
                    className="px-3.5 py-2 border-none rounded-lg bg-brand-dark text-white text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap hover:bg-brand-dark-hover transition-colors"
                    onClick={handleCreateFolder}
                  >만들기</button>
                </div>
              )}
              <p className={cn('mt-1.5 text-[11px] italic', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>선택한 폴더는 개인에게만 적용됩니다.</p>
            </div>
          </div>
        )}

        {/* Members Step (topic) or main view (chat) */}
        {(step === 'members' || !isTopic) && (
          <>
            {isTopic && (
              <div className={cn('px-5 py-2.5 border-b shrink-0', isDark ? 'border-[#475569] bg-[#0f172a]' : 'border-[#e2e8f0] bg-[#f8fafc]')}>
                <span className={cn('block text-[13px] font-semibold', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>멤버 초대 (선택)</span>
                <span className={cn('block text-[11px] mt-0.5', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>나중에 초대할 수도 있습니다</span>
              </div>
            )}
            {!isTopic && (
              <p className={cn('m-0 px-5 py-2.5 text-[13px] border-b shrink-0', isDark ? 'text-[#94a3b8] bg-[#0f172a] border-[#475569]' : 'text-[#64748b] bg-[#f8fafc] border-[#e2e8f0]')}>대화할 사람을 선택하세요</p>
            )}
            <div className={cn('px-5 py-2 border-b shrink-0', isDark ? 'border-[#475569]' : 'border-[#e2e8f0]')}>
              <input
                type="text"
                placeholder="이름으로 검색"
                className={cn(
                  'w-full px-2.5 py-[7px] border rounded-lg text-[13px] outline-none box-border transition-colors focus:border-brand-dark',
                  isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0] placeholder:text-slate-500' : 'border-[#e2e8f0] bg-[#f1f5f9] text-[#0f172a] placeholder:text-slate-400'
                )}
                id="member-search"
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  document.querySelectorAll('[data-user-item]').forEach((el) => {
                    const name = el.getAttribute('data-user-name')?.toLowerCase() || '';
                    (el as HTMLElement).style.display = name.includes(q) ? '' : 'none';
                  });
                }}
              />
            </div>
            <div className="flex-1 overflow-auto px-5 py-2 min-h-0 max-h-[280px]">
              {usersLoading ? (
                <p className={cn('text-sm m-0', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>사용자 목록 로딩 중...</p>
              ) : !Array.isArray(users) || users.length === 0 ? (
                <p className={cn('text-sm m-0', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>초대할 수 있는 사용자가 없습니다.</p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {(Array.isArray(users) ? users : []).map((u: User) => {
                    const displayText = customInitials[u.id] ?? (u.name?.trim().slice(0, 2) || '?').toUpperCase();
                    const isEditing = editingAvatarUserId === u.id;
                    return (
                      <li key={u.id} data-user-item data-user-name={u.name}>
                        <label className={cn(
                          'flex items-center gap-2.5 px-1.5 py-[7px] rounded-lg cursor-pointer transition-colors',
                          selected.has(u.id) ? (isDark ? 'bg-[rgba(91,141,239,0.08)]' : 'bg-[rgba(91,141,239,0.06)]') : (isDark ? 'hover:bg-[#334155]' : 'hover:bg-[#f1f5f9]')
                        )}>
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 cursor-pointer shrink-0 accent-brand-dark"
                          />
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden relative',
                              isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                            )}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingAvatarUserId(u.id); }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingAvatarUserId(u.id); } }}
                            title="더블클릭하여 이니셜 수정 (최대 2글자)"
                            aria-label={`${u.name} 아바타`}
                          >
                            {(u as User & { avatarUrl?: string }).avatarUrl && !isEditing ? (
                              <UserAvatar userId={u.id} name={u.name} avatarUrlPath={(u as User & { avatarUrl?: string }).avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} initialStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 12, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }} />
                            ) : isEditing ? (
                              <input
                                type="text"
                                defaultValue={customInitials[u.id] ?? (u.name?.trim().slice(0, 2) || '').toUpperCase()}
                                onBlur={(e) => saveCustomInitials(u.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveCustomInitials(u.id, (e.target as HTMLInputElement).value);
                                  if (e.key === 'Escape') { setEditingAvatarUserId(null); }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                maxLength={2}
                                className={cn(
                                  'w-full h-full border-none bg-transparent text-center text-xs font-bold outline-none p-0',
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                )}
                              />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full">{displayText}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={cn('text-[13px] font-medium mr-1.5', isDark ? 'text-[#e2e8f0]' : 'text-[#0f172a]')}>{u.name}</span>
                            <span className={cn('text-[11px] overflow-hidden text-ellipsis whitespace-nowrap', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>{u.email}</span>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {error && <p className="text-red-500 text-[13px] px-5 pb-2 m-0">{error}</p>}

        {/* Footer */}
        <div className={cn('flex items-center justify-between px-5 py-3 border-t shrink-0', isDark ? 'border-[#475569]' : 'border-[#e2e8f0]')}>
          <span className={cn('text-xs', isDark ? 'text-[#94a3b8]' : 'text-[#64748b]')}>
            {selected.size > 0 ? `${selected.size}명 선택됨` : (isTopic && step === 'form' ? '' : '대화할 사람을 선택하세요')}
          </span>
          <div className="flex gap-2">
            {isTopic && step === 'members' && (
              <button
                type="button"
                className={cn(
                  'px-4 py-2 border rounded-lg text-[13px] font-medium cursor-pointer transition-colors',
                  isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0] hover:bg-[#475569]' : 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f1f5f9]'
                )}
                onClick={() => setStep('form')}
              >이전</button>
            )}
            <button
              type="button"
              className={cn(
                'px-4 py-2 border rounded-lg text-[13px] font-medium cursor-pointer transition-colors',
                isDark ? 'border-[#475569] bg-[#334155] text-[#e2e8f0] hover:bg-[#475569]' : 'border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f1f5f9]'
              )}
              onClick={onClose}
            >취소</button>
            {isTopic && step === 'form' ? (
              <button
                type="button"
                className={cn(
                  'px-5 py-2 border-none rounded-lg text-[13px] font-semibold transition-colors',
                  !topicName.trim()
                    ? cn('cursor-not-allowed', isDark ? 'bg-[#334155] text-slate-500' : 'bg-slate-200 text-slate-400')
                    : 'cursor-pointer bg-brand-dark text-white hover:bg-brand-dark-hover'
                )}
                disabled={!topicName.trim()}
                onClick={() => { setFormSnapshot({ folderId, viewMode }); setStep('members'); }}
              >다음</button>
            ) : (
              <button
                type="button"
                className={cn(
                  'px-5 py-2 border-none rounded-lg text-[13px] font-semibold transition-colors',
                  !canCreate || loading
                    ? cn('cursor-not-allowed', isDark ? 'bg-[#334155] text-slate-500' : 'bg-slate-200 text-slate-400')
                    : 'cursor-pointer bg-brand-dark text-white hover:bg-brand-dark-hover'
                )}
                disabled={!canCreate || loading}
                onClick={handleCreate}
              >
                {loading ? '만드는 중...' : isTopic ? '아젠다 만들기' : (selected.size <= 1 ? '1:1 채팅 만들기' : '그룹 채팅 만들기')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
