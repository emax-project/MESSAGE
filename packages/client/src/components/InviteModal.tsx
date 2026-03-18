import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, roomsApi, type OrgUser } from '../api';
import { useThemeStore, useToastStore } from '../store';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import UIModal from './ui/UIModal';
import ModalFooter from './ui/ModalFooter';

type Props = {
  roomId: string;
  currentMemberIds: string[];
  onClose: () => void;
  onInvited: (newRoomId: string) => void;
};

function TreeChevron({ open }: { open: boolean }) {
  return open ? (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InviteModal({ roomId, currentMemberIds, onClose, onInvited }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideJoined, setHideJoined] = useState(true);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(new Set());
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);

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
  // When rendering tree: if no search, show all invitable (+ joined when toggle off). If search, show matching invitable.
  const showAllUsers = !searchLower;

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

  const toggleCompany = (companyId: string) => {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const toggleDepartmentOpen = (key: string) => {
    setCollapsedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const result = await roomsApi.addMembers(roomId, Array.from(selected));
      showToast(`${selected.size}명을 초대했습니다.`, 'success');
      onInvited(result.id);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredIdList = Array.from(filteredUserIds);
  const allChecked = filteredIdList.length > 0 && filteredIdList.every((id) => selected.has(id));
  const selectedUsers = Array.from(selected)
    .map((id) => allUsers.find((u) => u.id === id))
    .filter(Boolean) as { id: string; name: string; email: string }[];

  const st = getStyles(isDark);

  return (
    <UIModal title="멤버 초대" onClose={onClose} width={760}>
      {!orgLoading && allUsers.length > 0 && (
        <div style={st.searchWrap}>
          <div style={st.searchRow}>
            <UITextInput
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <label style={st.hideJoinedToggle}>
              <input
                type="checkbox"
                checked={hideJoined}
                onChange={(e) => setHideJoined(e.target.checked)}
                style={st.checkbox}
              />
              <span>참여중 숨기기</span>
            </label>
          </div>
        </div>
      )}

      <div style={st.body}>
        {orgLoading ? (
          <div style={st.skeletonWrap}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={st.skeletonLine} />
            ))}
          </div>
        ) : allUsers.length === 0 ? (
          <p style={st.emptyText}>초대할 수 있는 사용자가 없습니다.</p>
        ) : (
          <div style={st.contentGrid}>
            <div style={st.treePane}>
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
                    const visibleDepts = (company.departments ?? []).filter((dept) =>
                      (dept.users ?? []).some((u) => {
                        const isMember = memberSet.has(u.id);
                        if (hideJoined && isMember) return false;
                        if (showAllUsers) return true;
                        return !isMember && filteredUserIds.has(u.id);
                      })
                    );
                    if (visibleDepts.length === 0) return null;
                    const companyOpen = searchLower ? true : !collapsedCompanies.has(company.id);
                    return (
                      <div key={company.id} style={st.companyBlock}>
                        <button
                          type="button"
                          style={st.companyToggle}
                          onClick={() => toggleCompany(company.id)}
                        >
                          <span style={st.chevron}><TreeChevron open={companyOpen} /></span>
                          <span style={st.companyName}>{company.name}</span>
                        </button>
                        {companyOpen && visibleDepts.map((dept) => {
                          const invitable = (dept.users ?? []).filter((u) =>
                            !memberSet.has(u.id) && (showAllUsers || filteredUserIds.has(u.id))
                          );
                          const deptAllChecked = invitable.length > 0 && invitable.every((u) => selected.has(u.id));
                          const deptSomeChecked = invitable.some((u) => selected.has(u.id));
                          const deptKey = `${company.id}:${dept.id}`;
                          const deptOpen = searchLower ? true : !collapsedDepartments.has(deptKey);
                          return (
                            <div key={dept.id} style={st.deptBlock}>
                              <div style={st.deptRow}>
                                <input
                                  type="checkbox"
                                  checked={deptAllChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = !deptAllChecked && deptSomeChecked;
                                  }}
                                  onChange={() => toggleDepartment(invitable.map((u) => u.id))}
                                  style={st.checkbox}
                                />
                                <button
                                  type="button"
                                  style={st.deptToggle}
                                  onClick={() => toggleDepartmentOpen(deptKey)}
                                >
                                  <span style={st.chevron}><TreeChevron open={deptOpen} /></span>
                                  <span style={st.deptName}>{dept.name}</span>
                                </button>
                                <span style={st.deptSelect}>
                                  <span style={st.deptCount}>{invitable.length}명</span>
                                </span>
                              </div>
                              {deptOpen && <ul style={st.userList}>
                                {(dept.users ?? []).map((user) => {
                                  const isMember = memberSet.has(user.id);
                                  const visible = hideJoined
                                    ? !isMember && (showAllUsers || filteredUserIds.has(user.id))
                                    : showAllUsers || (!isMember && filteredUserIds.has(user.id));
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
                              </ul>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside style={st.selectionPane}>
              <div style={st.selectionHeader}>
                <h4 style={st.selectionTitle}>선택된 멤버</h4>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  style={st.clearBtn}
                  disabled={selectedUsers.length === 0}
                >
                  전체 해제
                </button>
              </div>
              {selectedUsers.length === 0 ? (
                <p style={st.selectionEmpty}>선택된 사용자가 없습니다.</p>
              ) : (
                <ul style={st.selectedList}>
                  {selectedUsers.map((u) => (
                    <li key={u.id} style={st.selectedItem}>
                      <div style={st.selectedUserMeta}>
                        <span style={st.userAvatar}>{u.name.trim()[0]?.toUpperCase() || '?'}</span>
                        <div style={st.selectedUserText}>
                          <span style={st.selectedUserName}>{u.name}</span>
                          {u.email && <span style={st.selectedUserEmail}>{u.email}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={st.removeBtn}
                        onClick={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.delete(u.id);
                            return next;
                          })
                        }
                        aria-label={`${u.name} 선택 해제`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}
      </div>

      <ModalFooter justify="space-between" bordered paddingTop={12} marginTop={0} style={{ gap: 12 }}>
        <span style={st.selectedCount}>총 {selected.size}명 선택</span>
        <div style={st.footerButtons}>
          <UIButton variant="secondary" onClick={onClose}>
            취소
          </UIButton>
          <UIButton
            variant="primary"
            disabled={selected.size === 0 || loading}
            onClick={handleInvite}
          >
            {loading ? '초대 중...' : `${selected.size}명 초대`}
          </UIButton>
        </div>
      </ModalFooter>
    </UIModal>
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
    searchRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    hideJoinedToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: isDark ? '#94a3b8' : '#64748b',
      whiteSpace: 'nowrap',
    },
    body: {
      flex: 1,
      overflow: 'auto',
      padding: '12px 20px',
      minHeight: 0,
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
      gap: 14,
      minHeight: 360,
    },
    treePane: {
      minWidth: 0,
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 10,
      padding: '10px 12px',
      background: isDark ? '#0f172a' : '#fff',
    },
    selectionPane: {
      minWidth: 0,
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 10,
      padding: '10px 12px',
      background: isDark ? '#0f172a' : '#fff',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 460,
    },
    selectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    selectionTitle: {
      margin: 0,
      fontSize: 13,
      fontWeight: 700,
      color: isDark ? '#e2e8f0' : '#1e293b',
    },
    clearBtn: {
      border: 'none',
      background: 'none',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 12,
      cursor: 'pointer',
      padding: 0,
    },
    selectionEmpty: {
      margin: 0,
      fontSize: 12,
      color: isDark ? '#94a3b8' : '#64748b',
      paddingTop: 8,
    },
    selectedList: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      overflow: 'auto',
      minHeight: 0,
    },
    selectedItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '6px 4px',
      borderRadius: 8,
      background: isDark ? '#1e293b' : '#f8fafc',
    },
    selectedUserMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      flex: 1,
    },
    selectedUserText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    selectedUserName: {
      fontSize: 13,
      color: isDark ? '#e2e8f0' : '#1e293b',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    selectedUserEmail: {
      fontSize: 11,
      color: isDark ? '#94a3b8' : '#64748b',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    removeBtn: {
      border: 'none',
      background: 'none',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 16,
      cursor: 'pointer',
      padding: '0 4px',
      flexShrink: 0,
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
    companyToggle: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      border: 'none',
      background: 'none',
      padding: '7px 0',
      cursor: 'pointer',
      textAlign: 'left',
    },
    companyName: {
      fontSize: 13,
      fontWeight: 700,
      color: isDark ? '#94a3b8' : '#475569',
    },
    deptBlock: { marginLeft: 8, marginBottom: 8 },
    chevron: {
      width: 18,
      height: 18,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isDark ? '#64748b' : '#94a3b8',
      flexShrink: 0,
    },
    deptRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 0',
    },
    deptToggle: {
      border: 'none',
      background: 'none',
      padding: '2px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      minWidth: 0,
      flex: 1,
      textAlign: 'left',
    },
    deptSelect: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginLeft: 'auto',
    },
    deptName: { fontWeight: 600, fontSize: 14, color: isDark ? '#cbd5e1' : '#555' },
    deptCount: { fontSize: 12, color: isDark ? '#64748b' : '#888' },
    checkbox: { width: 16, height: 16, margin: 0, cursor: 'pointer', flexShrink: 0 },
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
    selectedCount: { fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' },
    footerButtons: { display: 'flex', gap: 8 },
  };
}
