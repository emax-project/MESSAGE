import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, roomsApi, foldersApi, type User, type Folder, type Room } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import UserAvatar from './UserAvatar';
import AvatarEditModal from './AvatarEditModal';
import { getThemeTokens } from './ui/themeTokens';
import UICloseButton from './ui/UICloseButton';

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

  const st = getStyles(isDark);
  const isTopic = mode === 'topic';
  const title = isTopic ? '새 아젠다 생성' : '새 채팅';
  const canCreate = isTopic ? topicName.trim().length > 0 : selected.size > 0;

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={st.header}>
          <h3 style={st.title}>{title}</h3>
          <UICloseButton onClick={onClose} />
        </div>

        {/* Topic Form Step */}
        {isTopic && step === 'form' && (
          <div style={st.formBody}>
            {/* Name */}
            <div style={st.fieldGroup}>
              <div style={st.labelRow}>
                <label style={st.label}>이름 <span style={st.required}>*</span></label>
                <span style={{ ...st.charCount, ...(topicName.length > 60 ? { color: '#ef4444' } : {}) }}>{topicName.length}/60</span>
              </div>
              <input
                type="text"
                placeholder="아젠다 이름을 입력하세요"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value.slice(0, 60))}
                maxLength={60}
                style={st.input}
                autoFocus
              />
            </div>

            {/* Room Profile Photo */}
            <div style={st.fieldGroup}>
              <label style={st.label}>방 프로필 사진</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: isDark ? '#334155' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {roomAvatarPreview ? (
                    <img src={roomAvatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569' }}>
                      {(roomInitials || topicName.trim()).slice(0, 2).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {!roomAvatarFile && (
                    <input
                      type="text"
                      placeholder="이니셜 (최대 2글자)"
                      value={roomInitials}
                      onChange={(e) => setRoomInitials(e.target.value.slice(0, 2))}
                      maxLength={2}
                      style={{
                        ...st.input,
                        width: 100,
                        padding: '6px 10px',
                        fontSize: 13,
                        marginBottom: 0,
                      }}
                    />
                  )}
                  <label style={{ ...st.avatarUploadBtn, cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      style={{ display: 'none' }}
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
                      style={{ ...st.avatarRemoveBtn, color: '#ef4444' }}
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
              <p style={st.fieldHint}>
                {roomAvatarFile ? 'jpg, png, gif, webp (최대 10MB)' : '이니셜은 사진 없을 때 표시됩니다'}
              </p>
            </div>

            {/* Description */}
            <div style={st.fieldGroup}>
              <div style={st.labelRow}>
                <label style={st.label}>아젠다 설명</label>
                <span style={{ ...st.charCount, ...(topicDesc.length > 300 ? { color: '#ef4444' } : {}) }}>{topicDesc.length}/300</span>
              </div>
              <textarea
                placeholder="아젠다에 대한 설명을 입력하세요 (선택)"
                value={topicDesc}
                onChange={(e) => setTopicDesc(e.target.value.slice(0, 300))}
                maxLength={300}
                style={st.textarea}
                rows={3}
              />
            </div>

            {/* Public/Private */}
            <div style={st.fieldGroup}>
              <label style={st.label}>공개 여부</label>
              <div style={st.radioGroup}>
                <label style={{ ...st.radioCard, ...(isPublic ? st.radioCardActive : {}) }}>
                  <input type="radio" name="visibility" checked={isPublic} onChange={() => setIsPublic(true)} style={st.radioHidden} />
                  <div style={st.radioCardCheck}>{isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div style={st.radioText}>공개</div>
                    <div style={st.radioHint}>누구나 검색하여 참가 가능</div>
                  </div>
                </label>
                <label style={{ ...st.radioCard, ...(!isPublic ? st.radioCardActive : {}) }}>
                  <input type="radio" name="visibility" checked={!isPublic} onChange={() => setIsPublic(false)} style={st.radioHidden} />
                  <div style={st.radioCardCheck}>{!isPublic ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <div style={st.radioText}>비공개</div>
                    <div style={st.radioHint}>초대된 멤버만 참가 가능</div>
                  </div>
                </label>
              </div>
              <p style={st.fieldHint}>아젠다 생성 이후 변경 불가</p>
            </div>

            {/* View Mode: 챗뷰(메시지 기반) vs 보드뷰(게시글 기반) - JANDI 참고 */}
            <div style={st.fieldGroup}>
              <div style={st.labelRow}>
                <label style={st.label}>보기 방식 <span style={st.required}>*</span></label>
                <span style={st.fieldHintInline}>아젠다 생성 이후 변경 불가</span>
              </div>
              <div style={st.viewModeGroup}>
                <label style={{ ...st.viewModeCard, ...(viewMode === 'chat' ? st.viewModeCardActive : {}) }}>
                  <input type="radio" name="viewMode" checked={viewMode === 'chat'} onChange={() => setViewMode('chat')} style={st.radioHidden} />
                  <div style={st.viewModeIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div style={st.viewModeRadio}>{viewMode === 'chat' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span style={st.viewModeLabel}>챗뷰</span>
                    <div style={st.viewModeHint}>메시지 기반 · 빠른 대화·실시간 논의</div>
                  </div>
                </label>
                <label style={{ ...st.viewModeCard, ...(viewMode === 'board' ? st.viewModeCardActive : {}) }}>
                  <input type="radio" name="viewMode" checked={viewMode === 'board'} onChange={() => setViewMode('board')} style={st.radioHidden} />
                  <div style={st.viewModeIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div style={st.viewModeRadio}>{viewMode === 'board' ? '\u25C9' : '\u25CB'}</div>
                  <div>
                    <span style={st.viewModeLabel}>보드뷰</span>
                    <div style={st.viewModeHint}>게시글 기반 · 공지·회의록·장문 기록</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Folder Selection */}
            <div style={st.fieldGroup}>
              <label style={st.label}>폴더 선택 (옵션)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  style={st.select}
                >
                  <option value="">아젠다를 생성할 폴더를 선택해 주세요.</option>
                  {(folders as Folder[]).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  style={st.newFolderBtn}
                  onClick={() => setShowNewFolder(!showNewFolder)}
                  title="새 폴더 만들기"
                >+</button>
              </div>
              {showNewFolder && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input
                    type="text"
                    placeholder="새 폴더 이름"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    style={{ ...st.input, marginBottom: 0, flex: 1 }}
                  />
                  <button type="button" style={st.newFolderSaveBtn} onClick={handleCreateFolder}>만들기</button>
                </div>
              )}
              <p style={st.fieldHint}>선택한 폴더는 개인에게만 적용됩니다.</p>
            </div>
          </div>
        )}

        {/* Members Step (topic) or main view (chat) */}
        {(step === 'members' || !isTopic) && (
          <>
            {isTopic && (
              <div style={st.stepInfo}>
                <span style={st.stepInfoText}>멤버 초대 (선택)</span>
                <span style={st.stepInfoSub}>나중에 초대할 수도 있습니다</span>
              </div>
            )}
            {!isTopic && (
              <p style={st.hint}>대화할 사람을 선택하세요</p>
            )}
            <div style={st.memberSearch}>
              <input
                type="text"
                placeholder="이름으로 검색"
                style={st.memberSearchInput}
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
            <div style={st.memberBody}>
              {usersLoading ? (
                <p style={st.loadingText}>사용자 목록 로딩 중...</p>
              ) : !Array.isArray(users) || users.length === 0 ? (
                <p style={st.loadingText}>초대할 수 있는 사용자가 없습니다.</p>
              ) : (
                <ul style={st.userList}>
                  {(Array.isArray(users) ? users : []).map((u: User) => {
                    const displayText = customInitials[u.id] ?? (u.name?.trim().slice(0, 2) || '?').toUpperCase();
                    const isEditing = editingAvatarUserId === u.id;
                    return (
                      <li key={u.id} data-user-item data-user-name={u.name}>
                        <label style={st.userRow}>
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleUser(u.id)}
                            style={st.checkbox}
                          />
                          <div
                            style={{ ...st.userAvatar, overflow: 'hidden', position: 'relative' as const }}
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
                                style={{
                                  width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: 12, fontWeight: 700,
                                  color: isDark ? '#94a3b8' : '#475569', outline: 'none', padding: 0,
                                }}
                              />
                            ) : (
                              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{displayText}</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={st.userName}>{u.name}</span>
                            <span style={st.userEmail}>{u.email}</span>
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
        {error && <p style={st.error}>{error}</p>}

        {/* Footer */}
        <div style={st.footer}>
          <span style={st.selectedCount}>
            {selected.size > 0 ? `${selected.size}명 선택됨` : (isTopic && step === 'form' ? '' : '대화할 사람을 선택하세요')}
          </span>
          <div style={st.footerButtons}>
            {isTopic && step === 'members' && (
              <button type="button" style={st.cancelBtn} onClick={() => setStep('form')}>이전</button>
            )}
            <button type="button" style={st.cancelBtn} onClick={onClose}>취소</button>
            {isTopic && step === 'form' ? (
              <button
                type="button"
                style={{ ...st.createBtn, ...(!topicName.trim() ? st.createBtnDisabled : {}) }}
                disabled={!topicName.trim()}
                onClick={() => { setFormSnapshot({ folderId, viewMode }); setStep('members'); }}
              >다음</button>
            ) : (
              <button
                type="button"
                style={{ ...st.createBtn, ...(!canCreate || loading ? st.createBtnDisabled : {}) }}
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

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const t = getThemeTokens(isDark);
  const border = t.border;
  const text = t.text;
  const sub = t.textMuted;
  const muted = t.textMuted;
  const inputBg = t.bgMuted;
  const accent = '#171717';

  return {
    overlay: {
      position: 'fixed',
      inset: 0,
      zIndex: 10001,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modal: {
      background: t.bgSurface,
      borderRadius: 12,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.15)',
      border: `1px solid ${border}`,
      width: 460,
      maxWidth: '95vw',
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: `1px solid ${border}`,
      flexShrink: 0,
    },
    title: { margin: 0, fontSize: 18, fontWeight: 600, color: t.textStrong },

    /* Form */
    formBody: {
      padding: '16px 20px',
      overflowY: 'auto' as const,
      flex: 1,
      minHeight: 0,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    labelRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: text,
    },
    required: {
      color: '#ef4444',
      marginLeft: 2,
    },
    charCount: {
      fontSize: 11,
      color: muted,
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 14,
      background: inputBg,
      color: text,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 14,
      background: inputBg,
      color: text,
      outline: 'none',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
      lineHeight: 1.5,
    },
    select: {
      flex: 1,
      padding: '9px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 13,
      background: inputBg,
      color: text,
      outline: 'none',
      cursor: 'pointer',
    },

    /* Radio cards (public/private) */
    radioGroup: {
      display: 'flex',
      gap: 10,
      marginTop: 4,
    },
    radioCard: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      cursor: 'pointer',
      flex: 1,
      padding: '10px 12px',
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: inputBg,
    },
    radioCardActive: {
      borderColor: accent,
      background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(34,197,94,0.04)',
    },
    radioHidden: {
      position: 'absolute' as const,
      opacity: 0,
      width: 0,
      height: 0,
      pointerEvents: 'none' as const,
    },
    radioCardCheck: {
      fontSize: 16,
      color: accent,
      flexShrink: 0,
      marginTop: 1,
    },
    radioText: {
      fontSize: 13,
      fontWeight: 600,
      color: text,
    },
    radioHint: {
      fontSize: 11,
      color: muted,
      marginTop: 2,
    },
    fieldHint: {
      margin: '6px 0 0',
      fontSize: 11,
      color: muted,
      fontStyle: 'italic' as const,
    },
    avatarUploadBtn: {
      padding: '6px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      background: inputBg,
      color: text,
      fontSize: 12,
    },
    avatarRemoveBtn: {
      padding: '4px 12px',
      border: 'none',
      background: 'none',
      fontSize: 11,
      cursor: 'pointer',
    },
    fieldHintInline: {
      fontSize: 11,
      color: '#ef4444',
      fontWeight: 500,
    },

    /* View Mode cards */
    viewModeGroup: {
      display: 'flex',
      gap: 10,
      marginTop: 4,
    },
    viewModeCard: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      flex: 1,
      padding: '14px 12px 10px',
      borderRadius: 8,
      border: `2px solid ${border}`,
      background: inputBg,
      textAlign: 'center' as const,
    },
    viewModeCardActive: {
      borderColor: accent,
      background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(34,197,94,0.04)',
    },
    viewModeIcon: {
      color: isDark ? '#94a3b8' : '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewModeRadio: {
      fontSize: 16,
      color: accent,
    },
    viewModeLabel: {
      fontSize: 12,
      fontWeight: 600,
      color: text,
    },
    viewModeHint: {
      fontSize: 10,
      color: sub,
      marginTop: 2,
      lineHeight: 1.3,
    },

    /* Folder */
    newFolderBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: isDark ? '#475569' : '#e5e7eb',
      color: isDark ? '#e2e8f0' : '#333',
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    newFolderSaveBtn: {
      padding: '8px 14px',
      border: 'none',
      borderRadius: 8,
      background: '#475569',
      color: '#fff',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      flexShrink: 0,
      whiteSpace: 'nowrap' as const,
    },

    /* Step info */
    stepInfo: {
      padding: '10px 20px',
      borderBottom: `1px solid ${border}`,
      background: isDark ? '#0f172a' : '#f8fafc',
      flexShrink: 0,
    },
    stepInfoText: {
      display: 'block',
      fontSize: 13,
      fontWeight: 600,
      color: text,
    },
    stepInfoSub: {
      display: 'block',
      fontSize: 11,
      color: muted,
      marginTop: 2,
    },

    /* Hint (chat mode) */
    hint: {
      margin: 0,
      padding: '10px 20px',
      fontSize: 13,
      color: sub,
      background: isDark ? '#0f172a' : '#f8fafc',
      borderBottom: `1px solid ${border}`,
      flexShrink: 0,
    },

    /* Member search */
    memberSearch: {
      padding: '8px 20px',
      borderBottom: `1px solid ${border}`,
      flexShrink: 0,
    },
    memberSearchInput: {
      width: '100%',
      padding: '7px 10px',
      border: `1px solid ${border}`,
      borderRadius: 6,
      fontSize: 13,
      background: inputBg,
      color: text,
      outline: 'none',
      boxSizing: 'border-box' as const,
    },

    /* Member list */
    memberBody: {
      flex: 1,
      overflow: 'auto',
      padding: '8px 20px',
      minHeight: 0,
      maxHeight: 280,
    },
    loadingText: { color: sub, fontSize: 14, margin: 0 },
    userList: { listStyle: 'none', margin: 0, padding: 0 },
    userRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 6px',
      borderRadius: 8,
      cursor: 'pointer',
    },
    checkbox: { width: 16, height: 16, cursor: 'pointer', flexShrink: 0 },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: '50%',
      background: isDark ? '#334155' : '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      color: isDark ? '#94a3b8' : '#475569',
      flexShrink: 0,
    },
    userName: { fontSize: 13, fontWeight: 500, color: text, marginRight: 6 },
    userEmail: { fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

    /* Error */
    error: {
      color: '#ef4444',
      fontSize: 13,
      padding: '0 20px 8px',
      margin: 0,
    },

    /* Footer */
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderTop: `1px solid ${border}`,
      flexShrink: 0,
    },
    selectedCount: { fontSize: 12, color: sub },
    footerButtons: { display: 'flex', gap: 8 },
    cancelBtn: {
      padding: '8px 16px',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      borderRadius: 8,
      background: isDark ? '#334155' : '#fff',
      color: isDark ? '#e2e8f0' : '#555',
      fontSize: 13,
      cursor: 'pointer',
    },
    createBtn: {
      padding: '8px 20px',
      border: 'none',
      borderRadius: 8,
      background: '#475569',
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
    },
    createBtnDisabled: {
      background: isDark ? '#334155' : '#cbd5e1',
      color: isDark ? '#64748b' : '#fff',
      cursor: 'not-allowed',
    },
  };
}
