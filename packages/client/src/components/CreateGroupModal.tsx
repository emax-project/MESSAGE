import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, roomsApi, foldersApi, type User, type Folder, type Room } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import UserAvatar from './UserAvatar';
import AvatarEditModal from './AvatarEditModal';
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
  const [roomAvatarFile, setRoomAvatarFile] = useState<File | null>(null);
  const [roomAvatarPreview, setRoomAvatarPreview] = useState<string | null>(null);
  const [roomAvatarFileToCrop, setRoomAvatarFileToCrop] = useState<File | null>(null);
  const [roomInitials, setRoomInitials] = useState('');
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
        const trimmedInitials = (roomInitials.trim() || topicName.trim()).slice(0, 2).toUpperCase();
        if (trimmedInitials) payload.initials = trimmedInitials;
        const trimmedFolderId = snap.folderId ? String(snap.folderId).trim() : '';
        if (trimmedFolderId) payload.folderId = trimmedFolderId;
        if (import.meta.env.DEV) console.log('[CreateGroupModal] sending:', payload);
        const room = await roomsApi.createTopic(payload);
        let avatarUrl: string | null = (room as { avatarUrl?: string })?.avatarUrl ?? null;
        if (roomAvatarFile) {
          if (import.meta.env.DEV) console.log('[CreateGroupModal] 아바타 업로드 시도 roomId=', room.id, 'file=', roomAvatarFile.name, roomAvatarFile.size, 'bytes');
          try {
            const { avatarUrl: uploaded } = await roomsApi.uploadAvatar(room.id, roomAvatarFile);
            avatarUrl = uploaded;
            if (import.meta.env.DEV) console.log('[CreateGroupModal] 아바타 업로드 성공:', uploaded);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn('[CreateGroupModal] 아바타 업로드 실패:', msg);
            setError(`프로필 사진 업로드 실패: ${msg}`);
            setLoading(false);
            return;
          }
        }
        const viewModeToUse = (room as { viewMode?: string })?.viewMode ?? snap.viewMode ?? viewMode;
        const folderIdFromServer = (room as { folderId?: string | null })?.folderId ?? (trimmedFolderId || null);
        const initialsFromServer = (room as { initials?: string | null })?.initials ?? (trimmedInitials || null);
        const newRoomData = {
          id: room.id,
          name: room.name,
          avatarUrl,
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
            ? 'bg-[#222529] border-[#3a3f46] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-white border-[#dde1e6] shadow-[0_8px_32px_rgba(0,0,0,0.15)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between px-5 py-4 border-b shrink-0', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
          <h3 className={cn('m-0 text-lg font-semibold', isDark ? 'text-white' : 'text-[#161616]')}>{title}</h3>
          <UICloseButton onClick={onClose} />
        </div>

        {/* Topic Form Step */}
        {isTopic && step === 'form' && (
          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
            {/* Name */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>이름 <span className="text-red-500 ml-0.5">*</span></label>
                <span className={cn('text-[11px]', topicName.length > 60 ? 'text-red-500' : (isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]'))}>{topicName.length}/60</span>
              </div>
              <input
                type="text"
                placeholder="아젠다 이름을 입력하세요"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value.slice(0, 60))}
                maxLength={60}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm outline-none box-border',
                  isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
                )}
                autoFocus
              />
            </div>

            {/* Room Profile Photo */}
            <div className="mb-4">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>방 프로필 사진</label>
              <div className="flex items-center gap-3 mt-1.5">
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shrink-0',
                    isDark ? 'bg-slate-700' : 'bg-slate-200'
                  )}
                >
                  {roomAvatarPreview ? (
                    <img src={roomAvatarPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className={cn('text-lg font-bold', isDark ? 'text-slate-400' : 'text-slate-600')}>
                      {(roomInitials || topicName.trim()).slice(0, 2).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  {!roomAvatarFile && (
                    <input
                      type="text"
                      placeholder="이니셜 (최대 2글자)"
                      value={roomInitials}
                      onChange={(e) => setRoomInitials(e.target.value.slice(0, 2))}
                      maxLength={2}
                      className={cn(
                        'w-[100px] px-2.5 py-1.5 border rounded-lg text-[13px] outline-none box-border',
                        isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
                      )}
                    />
                  )}
                  <label
                    className={cn(
                      'px-3 py-1.5 border rounded-lg text-xs cursor-pointer',
                      isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
                    )}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.type.startsWith('image/')) {
                          setRoomAvatarFileToCrop(f);
                        }
                        e.target.value = '';
                      }}
                    />
                    {roomAvatarFile ? '사진 변경' : '사진 선택'}
                  </label>
                  {(roomAvatarFile || roomAvatarFileToCrop) && (
                    <button
                      type="button"
                      className="py-1 px-3 border-none bg-transparent text-[11px] cursor-pointer text-red-500"
                      onClick={() => {
                        setRoomAvatarFile(null);
                        setRoomAvatarFileToCrop(null);
                        setRoomAvatarPreview((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return null;
                        });
                      }}
                    >
                      제거
                    </button>
                  )}
                </div>
              </div>
              {roomAvatarFileToCrop && (
                <AvatarEditModal
                  file={roomAvatarFileToCrop}
                  onClose={() => setRoomAvatarFileToCrop(null)}
                  onConfirm={async (croppedFile) => {
                    setRoomAvatarFile(croppedFile);
                    setRoomAvatarPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return URL.createObjectURL(croppedFile);
                    });
                    setRoomAvatarFileToCrop(null);
                  }}
                />
              )}
              <p className={cn('mt-1.5 text-[11px] italic', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
                {roomAvatarFile ? 'jpg, png, gif, webp (최대 10MB)' : '이니셜은 사진 없을 때 표시됩니다'}
              </p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>아젠다 설명</label>
                <span className={cn('text-[11px]', topicDesc.length > 300 ? 'text-red-500' : (isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]'))}>{topicDesc.length}/300</span>
              </div>
              <textarea
                placeholder="아젠다에 대한 설명을 입력하세요 (선택)"
                value={topicDesc}
                onChange={(e) => setTopicDesc(e.target.value.slice(0, 300))}
                maxLength={300}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm outline-none box-border resize-y leading-normal',
                  isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
                )}
                rows={3}
              />
            </div>

            {/* Public/Private */}
            <div className="mb-4">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>공개 여부</label>
              <div className="flex gap-2.5 mt-1">
                <label
                  className={cn(
                    'flex items-start gap-2 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border',
                    isPublic ? 'border-neutral-900' : (isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]'),
                    isPublic
                      ? (isDark ? 'bg-[rgba(99,102,241,0.08)]' : 'bg-[rgba(34,197,94,0.04)]')
                      : (isDark ? 'bg-[#2a2d31]' : 'bg-[#f1f3f5]')
                  )}
                >
                  <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className="text-base text-neutral-900 shrink-0 mt-px">{isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>공개</div>
                    <div className={cn('text-[11px] mt-0.5', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>누구나 검색하여 참가 가능</div>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex items-start gap-2 cursor-pointer flex-1 px-3 py-2.5 rounded-lg border',
                    !isPublic ? 'border-neutral-900' : (isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]'),
                    !isPublic
                      ? (isDark ? 'bg-[rgba(99,102,241,0.08)]' : 'bg-[rgba(34,197,94,0.04)]')
                      : (isDark ? 'bg-[#2a2d31]' : 'bg-[#f1f3f5]')
                  )}
                >
                  <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className="text-base text-neutral-900 shrink-0 mt-px">{!isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>비공개</div>
                    <div className={cn('text-[11px] mt-0.5', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>초대된 멤버만 참가 가능</div>
                  </div>
                </label>
              </div>
              <p className={cn('mt-1.5 text-[11px] italic', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>아젠다 생성 이후 변경 불가</p>
            </div>

            {/* View Mode: 챗뷰(메시지 기반) vs 보드뷰(게시글 기반) - JANDI 참고 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>보기 방식 <span className="text-red-500 ml-0.5">*</span></label>
                <span className="text-[11px] text-red-500 font-medium">아젠다 생성 이후 변경 불가</span>
              </div>
              <div className="flex gap-2.5 mt-1">
                <label
                  className={cn(
                    'flex flex-col items-center gap-1.5 cursor-pointer flex-1 pt-3.5 px-3 pb-2.5 rounded-lg border-2 text-center',
                    viewMode === 'chat' ? 'border-neutral-900' : (isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]'),
                    viewMode === 'chat'
                      ? (isDark ? 'bg-[rgba(99,102,241,0.08)]' : 'bg-[rgba(34,197,94,0.04)]')
                      : (isDark ? 'bg-[#2a2d31]' : 'bg-[#f1f3f5]')
                  )}
                >
                  <input type="radio" name="viewMode" checked={viewMode === 'chat'} onChange={() => setViewMode('chat')} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('flex items-center justify-center', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="text-base text-neutral-900">{viewMode === 'chat' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span className={cn('text-xs font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>챗뷰</span>
                    <div className={cn('text-[10px] mt-0.5 leading-tight', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>메시지 기반 · 빠른 대화·실시간 논의</div>
                  </div>
                </label>
                <label
                  className={cn(
                    'flex flex-col items-center gap-1.5 cursor-pointer flex-1 pt-3.5 px-3 pb-2.5 rounded-lg border-2 text-center',
                    viewMode === 'board' ? 'border-neutral-900' : (isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]'),
                    viewMode === 'board'
                      ? (isDark ? 'bg-[rgba(99,102,241,0.08)]' : 'bg-[rgba(34,197,94,0.04)]')
                      : (isDark ? 'bg-[#2a2d31]' : 'bg-[#f1f3f5]')
                  )}
                >
                  <input type="radio" name="viewMode" checked={viewMode === 'board'} onChange={() => setViewMode('board')} className="absolute opacity-0 w-0 h-0 pointer-events-none" />
                  <div className={cn('flex items-center justify-center', isDark ? 'text-slate-400' : 'text-gray-500')}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className="text-base text-neutral-900">{viewMode === 'board' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span className={cn('text-xs font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>보드뷰</span>
                    <div className={cn('text-[10px] mt-0.5 leading-tight', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>게시글 기반 · 공지·회의록·장문 기록</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Folder Selection */}
            <div className="mb-4">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>폴더 선택 (옵션)</label>
              <div className="flex gap-2 items-center mt-1">
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className={cn(
                    'flex-1 px-3 py-[9px] border rounded-lg text-[13px] outline-none cursor-pointer',
                    isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
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
                    'w-[34px] h-[34px] rounded-lg border flex items-center justify-center text-lg cursor-pointer shrink-0',
                    isDark ? 'border-[#3a3f46] bg-slate-600 text-slate-200' : 'border-[#dde1e6] bg-gray-200 text-[#333]'
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
                      isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
                    )}
                  />
                  <button
                    type="button"
                    className="px-3.5 py-2 border-none rounded-lg bg-slate-600 text-white text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                    onClick={handleCreateFolder}
                  >만들기</button>
                </div>
              )}
              <p className={cn('mt-1.5 text-[11px] italic', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>선택한 폴더는 개인에게만 적용됩니다.</p>
            </div>
          </div>
        )}

        {/* Members Step (topic) or main view (chat) */}
        {(step === 'members' || !isTopic) && (
          <>
            {isTopic && (
              <div className={cn('px-5 py-2.5 border-b shrink-0', isDark ? 'border-[#3a3f46] bg-[#0f172a]' : 'border-[#dde1e6] bg-[#f8fafc]')}>
                <span className={cn('block text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>멤버 초대 (선택)</span>
                <span className={cn('block text-[11px] mt-0.5', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>나중에 초대할 수도 있습니다</span>
              </div>
            )}
            {!isTopic && (
              <p className={cn('m-0 px-5 py-2.5 text-[13px] border-b shrink-0', isDark ? 'text-[#a7adb4] bg-[#0f172a] border-[#3a3f46]' : 'text-[#5e6470] bg-[#f8fafc] border-[#dde1e6]')}>대화할 사람을 선택하세요</p>
            )}
            <div className={cn('px-5 py-2 border-b shrink-0', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
              <input
                type="text"
                placeholder="이름으로 검색"
                className={cn(
                  'w-full px-2.5 py-[7px] border rounded-md text-[13px] outline-none box-border',
                  isDark ? 'border-[#3a3f46] bg-[#2a2d31] text-[#d1d2d3]' : 'border-[#dde1e6] bg-[#f1f3f5] text-[#1d1c1d]'
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
                <p className={cn('text-sm m-0', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>사용자 목록 로딩 중...</p>
              ) : !Array.isArray(users) || users.length === 0 ? (
                <p className={cn('text-sm m-0', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>초대할 수 있는 사용자가 없습니다.</p>
              ) : (
                <ul className="list-none m-0 p-0">
                  {(Array.isArray(users) ? users : []).map((u: User) => {
                    const displayText = customInitials[u.id] ?? (u.name?.trim().slice(0, 2) || '?').toUpperCase();
                    const isEditing = editingAvatarUserId === u.id;
                    return (
                      <li key={u.id} data-user-item data-user-name={u.name}>
                        <label className="flex items-center gap-2.5 px-1.5 py-[7px] rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="w-4 h-4 cursor-pointer shrink-0"
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
                            <span className={cn('text-[13px] font-medium mr-1.5', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>{u.name}</span>
                            <span className={cn('text-[11px] overflow-hidden text-ellipsis whitespace-nowrap', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>{u.email}</span>
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
        <div className={cn('flex items-center justify-between px-5 py-3 border-t shrink-0', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
          <span className={cn('text-xs', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
            {selected.size > 0 ? `${selected.size}명 선택됨` : (isTopic && step === 'form' ? '' : '대화할 사람을 선택하세요')}
          </span>
          <div className="flex gap-2">
            {isTopic && step === 'members' && (
              <button
                type="button"
                className={cn(
                  'px-4 py-2 border rounded-lg text-[13px] cursor-pointer',
                  isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-[#555]'
                )}
                onClick={() => setStep('form')}
              >이전</button>
            )}
            <button
              type="button"
              className={cn(
                'px-4 py-2 border rounded-lg text-[13px] cursor-pointer',
                isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-[#555]'
              )}
              onClick={onClose}
            >취소</button>
            {isTopic && step === 'form' ? (
              <button
                type="button"
                className={cn(
                  'px-5 py-2 border-none rounded-lg text-[13px] font-semibold',
                  !topicName.trim()
                    ? cn('cursor-not-allowed', isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-300 text-white')
                    : 'cursor-pointer bg-slate-600 text-white'
                )}
                disabled={!topicName.trim()}
                onClick={() => { setFormSnapshot({ folderId, viewMode }); setStep('members'); }}
              >다음</button>
            ) : (
              <button
                type="button"
                className={cn(
                  'px-5 py-2 border-none rounded-lg text-[13px] font-semibold',
                  !canCreate || loading
                    ? cn('cursor-not-allowed', isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-300 text-white')
                    : 'cursor-pointer bg-slate-600 text-white'
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
