import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, roomsApi, type OrgUser } from '../api';
import { useThemeStore } from '../store';

type Props = {
  roomId: string;
  currentMemberIds: string[];
  onClose: () => void;
  onInvited: (newRoomId: string) => void;
};

export default function InviteModal({ roomId, currentMemberIds, onClose, onInvited }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.isDark);

  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: orgApi.tree,
  });

  const memberSet = new Set(currentMemberIds);

  // Collect all invitable users (id, name, email for search)
  const allUsers: { id: string; name: string; email: string }[] = [];
  const safeOrgTree = Array.isArray(orgTree) ? orgTree : [];
  safeOrgTree.forEach((c) =>
    (c.departments ?? []).forEach((d) =>
      (d.users ?? []).forEach((u: OrgUser) => {
        if (!memberSet.has(u.id)) allUsers.push({ id: u.id, name: u.name, email: u.email ?? '' });
      })
    )
  );

  // Search filter: name or email contains query (case-insensitive). Only filters invitable users.
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredUserIds = new Set<string>(
    searchLower
      ? allUsers
          .filter((u) => u.name.toLowerCase().includes(searchLower) || (u.email && u.email.toLowerCase().includes(searchLower)))
          .map((u) => u.id)
      : allUsers.map((u) => u.id)
  );
  // When rendering tree: if no search, show all (members + invitable). If search, only show matching invitable.
  const showAllUsers = !searchLower;

  // Close summary popover on outside click
  useEffect(() => {
    if (!summaryOpen) return;
    const close = (e: MouseEvent) => {
      if (summaryRef.current && !summaryRef.current.contains(e.target as Node)) setSummaryOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [summaryOpen]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleDepartment = (invitableUserIds: string[]) => {
    if (invitableUserIds.length === 0) return;
    const allSelected = invitableUserIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      invitableUserIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    const filteredIds = Array.from(filteredUserIds);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await roomsApi.addMembers(roomId, Array.from(selected));
      onInvited(result.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 실패');
    } finally {
      setLoading(false);
    }
  };

  const filteredIdList = Array.from(filteredUserIds);
  const allChecked = filteredIdList.length > 0 && filteredIdList.every((id) => selected.has(id));

  const st = getStyles(isDark);

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <h3 style={st.title}>멤버 초대</h3>
          <button type="button" style={st.closeBtn} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {!orgLoading && allUsers.length > 0 && (
          <div style={st.searchWrap}>
            <input
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={st.searchInput}
            />
          </div>
        )}

        <div style={st.body}>
          {orgLoading ? (
            <div style={st.skeletonWrap}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={st.skeletonLine} />
              ))}
            </div>
          ) : allUsers.length === 0 ? (
            <p style={st.emptyText}>초대할 수 있는 사용자가 없습니다.</p>
          ) : (
            <>
              <label style={st.allCheckRow}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  style={st.checkbox}
                />
                <span style={st.allCheckLabel}>전체 선택</span>
                <span style={st.countBadge}>
                  {searchLower ? `${filteredIdList.length}명 (검색)` : `${allUsers.length}명`}
                </span>
              </label>

              {searchLower && filteredIdList.length === 0 ? (
                <p style={st.emptyText}>검색 결과가 없습니다.</p>
              ) : (
              <div style={st.treeWrap}>
                {safeOrgTree.map((company) => {
                  const visibleDepts = (company.departments ?? []).filter((dept) => {
                    const invitable = (dept.users ?? []).filter((u) => !memberSet.has(u.id));
                    return showAllUsers ? invitable.length > 0 : invitable.some((u) => filteredUserIds.has(u.id));
                  });
                  if (visibleDepts.length === 0) return null;
                  return (
                    <div key={company.id} style={st.companyBlock}>
                      <span style={st.companyName}>{company.name}</span>
                      {visibleDepts.map((dept) => {
                        const invitable = (dept.users ?? []).filter((u) =>
                          !memberSet.has(u.id) && (showAllUsers || filteredUserIds.has(u.id))
                        );
                        const deptAllChecked = invitable.length > 0 && invitable.every((u) => selected.has(u.id));
                        const deptSomeChecked = invitable.some((u) => selected.has(u.id));
                        return (
                          <div key={dept.id} style={st.deptBlock}>
                            <label style={st.deptRow}>
                              <input
                                type="checkbox"
                                checked={deptAllChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = !deptAllChecked && deptSomeChecked;
                                }}
                                onChange={() => toggleDepartment(invitable.map((u) => u.id))}
                                style={st.checkbox}
                              />
                              <span style={st.deptName}>{dept.name}</span>
                              <span style={st.deptCount}>{invitable.length}명</span>
                            </label>
                            <ul style={st.userList}>
                              {(dept.users ?? []).map((user) => {
                                const isMember = memberSet.has(user.id);
                                const visible = showAllUsers || (!isMember && filteredUserIds.has(user.id));
                                if (!visible) return null;
                                if (isMember) {
                                  return (
                                    <li key={user.id} style={st.userItem}>
                                      <label style={{ ...st.userRow, ...st.userRowDisabled }}>
                                        <input type="checkbox" checked disabled style={st.checkbox} />
                                        <span style={st.userAvatar}>{user.name.trim()[0]?.toUpperCase() || '?'}</span>
                                        <span style={st.userNameDisabled}>{user.name}</span>
                                        <span style={st.memberBadge}>참여중</span>
                                      </label>
                                    </li>
                                  );
                                }
                                return (
                                  <li key={user.id} style={st.userItem}>
                                    <label style={st.userRow}>
                                      <input
                                        type="checkbox"
                                        checked={selected.has(user.id)}
                                        onChange={() => toggleUser(user.id)}
                                        style={st.checkbox}
                                      />
                                      <span style={st.userAvatar}>{user.name.trim()[0]?.toUpperCase() || '?'}</span>
                                      <span style={st.userName}>{user.name}</span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              )}
            </>
          )}
        </div>

        {error && <p style={st.error}>{error}</p>}

        <div style={st.footer}>
          <div style={st.footerLeft} ref={summaryRef}>
            {selected.size > 0 ? (
              <>
                <button
                  type="button"
                  style={st.summaryPill}
                  onClick={() => setSummaryOpen((v) => !v)}
                  aria-expanded={summaryOpen}
                >
                  {(() => {
                    const names = Array.from(selected)
                      .map((id) => allUsers.find((u) => u.id === id)?.name)
                      .filter(Boolean) as string[];
                    const n = names.length;
                    const text = n <= 2 ? names.join(', ') : `${names[0]}, ${names[1]} 외 ${n - 2}명`;
                    return `${n}명 선택됨: ${text}`;
                  })()}
                </button>
                {summaryOpen && (
                  <div style={st.summaryPopover}>
                    <div style={st.summaryPopoverTitle}>선택된 멤버</div>
                    {Array.from(selected).map((id) => {
                      const name = allUsers.find((u) => u.id === id)?.name ?? '';
                      return (
                        <div key={id} style={st.summaryPopoverRow}>
                          <span style={st.summaryPopoverName}>{name}</span>
                          <button
                            type="button"
                            style={st.summaryPopoverRemove}
                            onClick={() => setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; })}
                            aria-label={`${name} 선택 해제`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <span style={st.selectedCount}>선택된 사용자 없음</span>
            )}
          </div>
          <div style={st.footerButtons}>
            <button type="button" style={st.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              style={{
                ...st.inviteBtn,
                ...(selected.size === 0 || loading ? st.inviteBtnDisabled : {}),
              }}
              disabled={selected.size === 0 || loading}
              onClick={handleInvite}
            >
              {loading ? '초대 중...' : '초대'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
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
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      width: 420,
      maxWidth: '95vw',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
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
    searchWrap: {
      flexShrink: 0,
      padding: '10px 20px',
      borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      borderRadius: 8,
      fontSize: 14,
      background: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
    },
    body: {
      flex: 1,
      overflow: 'auto',
      padding: '12px 20px',
      minHeight: 0,
    },
    skeletonWrap: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 },
    skeletonLine: {
      height: 40,
      borderRadius: 8,
      background: isDark ? 'rgba(51,65,85,0.6)' : 'rgba(0,0,0,0.06)',
    },
    emptyText: { color: isDark ? '#94a3b8' : '#888', fontSize: 14, margin: 0, padding: '16px 0' },
    allCheckRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '10px 0',
      borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      cursor: 'pointer',
      marginBottom: 8,
    },
    allCheckLabel: { fontWeight: 600, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b' },
    countBadge: { fontSize: 12, color: isDark ? '#64748b' : '#888', marginLeft: 'auto' },
    treeWrap: {},
    companyBlock: { marginBottom: 12 },
    companyName: {
      display: 'block',
      fontSize: 13,
      fontWeight: 700,
      color: isDark ? '#94a3b8' : '#475569',
      padding: '4px 0',
      marginBottom: 4,
    },
    deptBlock: { marginLeft: 8, marginBottom: 8 },
    deptRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 0',
      cursor: 'pointer',
    },
    deptName: { fontWeight: 600, fontSize: 14, color: isDark ? '#cbd5e1' : '#555' },
    deptCount: { fontSize: 12, color: isDark ? '#64748b' : '#888', marginLeft: 'auto' },
    checkbox: { width: 16, height: 16, cursor: 'pointer', flexShrink: 0 },
    userList: { listStyle: 'none', margin: 0, padding: 0, marginLeft: 8 },
    userItem: { marginBottom: 2 },
    userRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 4px',
      borderRadius: 6,
      cursor: 'pointer',
    },
    userRowDisabled: { opacity: 0.55, cursor: 'default' },
    userAvatar: {
      width: 28,
      height: 28,
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
    userName: { fontSize: 14, color: isDark ? '#e2e8f0' : '#1e293b' },
    userNameDisabled: { fontSize: 14, color: isDark ? '#64748b' : '#999' },
    memberBadge: {
      fontSize: 11,
      color: isDark ? '#64748b' : '#888',
      background: isDark ? '#334155' : '#f0f0f0',
      padding: '2px 6px',
      borderRadius: 4,
      marginLeft: 'auto',
    },
    error: {
      color: '#ef4444',
      fontSize: 13,
      padding: '0 20px 8px',
      margin: 0,
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      flexShrink: 0,
      gap: 12,
    },
    footerLeft: { position: 'relative', flex: 1, minWidth: 0 },
    summaryPill: {
      border: 'none',
      background: isDark ? '#334155' : '#f1f5f9',
      color: isDark ? '#e2e8f0' : '#475569',
      fontSize: 13,
      padding: '6px 12px',
      borderRadius: 20,
      cursor: 'pointer',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    summaryPopover: {
      position: 'absolute',
      bottom: '100%',
      left: 0,
      marginBottom: 6,
      background: isDark ? '#334155' : '#fff',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      borderRadius: 10,
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.12)',
      minWidth: 200,
      maxHeight: 200,
      overflow: 'auto',
      zIndex: 10,
    },
    summaryPopoverTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: isDark ? '#94a3b8' : '#64748b',
      padding: '8px 12px',
      borderBottom: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
    },
    summaryPopoverRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px',
      gap: 8,
    },
    summaryPopoverName: { fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    summaryPopoverRemove: {
      border: 'none',
      background: 'none',
      color: isDark ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      fontSize: 16,
      padding: '0 4px',
      flexShrink: 0,
    },
    selectedCount: { fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' },
    footerButtons: { display: 'flex', gap: 8 },
    cancelBtn: {
      padding: '8px 16px',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      borderRadius: 8,
      background: isDark ? '#334155' : '#fff',
      color: isDark ? '#e2e8f0' : '#555',
      fontSize: 14,
      cursor: 'pointer',
    },
    inviteBtn: {
      padding: '8px 20px',
      border: 'none',
      borderRadius: 8,
      background: '#475569',
      color: '#fff',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    },
    inviteBtnDisabled: {
      background: isDark ? '#334155' : '#cbd5e1',
      color: isDark ? '#64748b' : '#fff',
      cursor: 'not-allowed',
    },
  };
}
