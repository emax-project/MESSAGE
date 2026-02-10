import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi, roomsApi, foldersApi, type User, type Folder } from '../api';
import { useThemeStore } from '../store';

type Props = {
  mode: 'topic' | 'chat';
  onClose: () => void;
  onCreated: (roomId: string) => void;
};

export default function CreateGroupModal({ mode, onClose, onCreated }: Props) {
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
  const isDark = useThemeStore((s) => s.isDark);
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
          setError('토픽 이름을 입력해주세요');
          setLoading(false);
          return;
        }
        const room = await roomsApi.createTopic({
          name: topicName.trim(),
          description: topicDesc.trim() || undefined,
          isPublic,
          viewMode,
          memberIds: Array.from(selected),
          folderId: folderId || undefined,
        });
        onCreated(room.id);
      } else {
        const ids = Array.from(selected);
        if (ids.length === 0) { setLoading(false); return; }
        if (ids.length === 1) {
          const room = await roomsApi.create(ids[0]);
          onCreated(room.id);
        } else {
          const firstRoom = await roomsApi.create(ids[0]);
          const groupRoom = await roomsApi.addMembers(firstRoom.id, ids.slice(1));
          onCreated(groupRoom.id);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  const st = getStyles(isDark);
  const isTopic = mode === 'topic';
  const title = isTopic ? '새 토픽 생성' : '새 채팅';
  const canCreate = isTopic ? topicName.trim().length > 0 : selected.size > 0;

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={st.header}>
          <h3 style={st.title}>{title}</h3>
          <button type="button" style={st.closeBtn} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
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
                placeholder="토픽 이름을 입력하세요"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value.slice(0, 60))}
                maxLength={60}
                style={st.input}
                autoFocus
              />
            </div>

            {/* Description */}
            <div style={st.fieldGroup}>
              <div style={st.labelRow}>
                <label style={st.label}>토픽 설명</label>
                <span style={{ ...st.charCount, ...(topicDesc.length > 300 ? { color: '#ef4444' } : {}) }}>{topicDesc.length}/300</span>
              </div>
              <textarea
                placeholder="토픽에 대한 설명을 입력하세요 (선택)"
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
              <p style={st.fieldHint}>토픽 생성 이후 변경 불가</p>
            </div>

            {/* View Mode */}
            <div style={st.fieldGroup}>
              <div style={st.labelRow}>
                <label style={st.label}>보기 방식 <span style={st.required}>*</span></label>
                <span style={st.fieldHintInline}>토픽 생성 이후 변경 불가</span>
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
                  <span style={st.viewModeLabel}>챗 뷰</span>
                </label>
                <label style={{ ...st.viewModeCard, ...(viewMode === 'board' ? st.viewModeCardActive : {}) }}>
                  <input type="radio" name="viewMode" checked={viewMode === 'board'} onChange={() => setViewMode('board')} style={st.radioHidden} />
                  <div style={st.viewModeIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div style={st.viewModeRadio}>{viewMode === 'board' ? '\u25C9' : '\u25CB'}</div>
                  <span style={st.viewModeLabel}>보드 뷰</span>
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
                  <option value="">토픽을 생성 할 폴더를 선택해 주세요.</option>
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
              ) : users.length === 0 ? (
                <p style={st.loadingText}>초대할 수 있는 사용자가 없습니다.</p>
              ) : (
                <ul style={st.userList}>
                  {users.map((u: User) => (
                    <li key={u.id} data-user-item data-user-name={u.name}>
                      <label style={st.userRow}>
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          style={st.checkbox}
                        />
                        <span style={st.userAvatar}>{u.name.trim()[0]?.toUpperCase() || '?'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={st.userName}>{u.name}</span>
                          <span style={st.userEmail}>{u.email}</span>
                        </div>
                      </label>
                    </li>
                  ))}
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
                onClick={() => setStep('members')}
              >다음</button>
            ) : (
              <button
                type="button"
                style={{ ...st.createBtn, ...(!canCreate || loading ? st.createBtnDisabled : {}) }}
                disabled={!canCreate || loading}
                onClick={handleCreate}
              >
                {loading ? '만드는 중...' : isTopic ? '토픽 만들기' : (selected.size <= 1 ? '1:1 채팅 만들기' : '그룹 채팅 만들기')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const sub = isDark ? '#94a3b8' : '#64748b';
  const muted = isDark ? '#64748b' : '#9ca3af';
  const inputBg = isDark ? '#334155' : '#f8fafc';
  const accent = isDark ? '#6366f1' : '#22c55e';

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
      background: isDark ? '#1e293b' : '#fff',
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
    title: { margin: 0, fontSize: 18, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' },
    closeBtn: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      padding: 4,
      display: 'flex',
      alignItems: 'center',
    },

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
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: isDark ? '#334155' : '#e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
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
