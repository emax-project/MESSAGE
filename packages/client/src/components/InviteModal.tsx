import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, roomsApi, type OrgCompany } from '../api';

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

  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: orgApi.tree,
  });

  const memberSet = new Set(currentMemberIds);

  // Collect all invitable users
  const allUsers: { id: string; name: string }[] = [];
  orgTree.forEach((c) =>
    c.departments.forEach((d) =>
      d.users.forEach((u) => {
        if (!memberSet.has(u.id)) allUsers.push(u);
      })
    )
  );

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleDepartment = (dept: OrgCompany['departments'][number]) => {
    const invitable = dept.users.filter((u) => !memberSet.has(u.id));
    const allSelected = invitable.every((u) => selected.has(u.id));
    setSelected((prev) => {
      const next = new Set(prev);
      invitable.forEach((u) => {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      });
      return next;
    });
  };

  const toggleAll = () => {
    const allSelected = allUsers.every((u) => selected.has(u.id));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allUsers.map((u) => u.id)));
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

  const allChecked = allUsers.length > 0 && allUsers.every((u) => selected.has(u.id));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>멤버 초대</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={styles.body}>
          {orgLoading ? (
            <p style={styles.loadingText}>조직 데이터 로딩 중...</p>
          ) : allUsers.length === 0 ? (
            <p style={styles.loadingText}>초대할 수 있는 사용자가 없습니다.</p>
          ) : (
            <>
              <label style={styles.allCheckRow}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  style={styles.checkbox}
                />
                <span style={styles.allCheckLabel}>전체 선택</span>
                <span style={styles.countBadge}>{allUsers.length}명</span>
              </label>

              <div style={styles.treeWrap}>
                {orgTree.map((company) => (
                  <div key={company.id} style={styles.companyBlock}>
                    <span style={styles.companyName}>{company.name}</span>
                    {company.departments.map((dept) => {
                      const invitable = dept.users.filter((u) => !memberSet.has(u.id));
                      const deptAllChecked = invitable.length > 0 && invitable.every((u) => selected.has(u.id));
                      const deptSomeChecked = invitable.some((u) => selected.has(u.id));
                      return (
                        <div key={dept.id} style={styles.deptBlock}>
                          <label style={styles.deptRow}>
                            <input
                              type="checkbox"
                              checked={deptAllChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = !deptAllChecked && deptSomeChecked;
                              }}
                              onChange={() => toggleDepartment(dept)}
                              disabled={invitable.length === 0}
                              style={styles.checkbox}
                            />
                            <span style={styles.deptName}>{dept.name}</span>
                            {invitable.length > 0 && (
                              <span style={styles.deptCount}>{invitable.length}명</span>
                            )}
                          </label>
                          <ul style={styles.userList}>
                            {dept.users.map((user) => {
                              const isMember = memberSet.has(user.id);
                              return (
                                <li key={user.id} style={styles.userItem}>
                                  <label style={{
                                    ...styles.userRow,
                                    ...(isMember ? styles.userRowDisabled : {}),
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={isMember || selected.has(user.id)}
                                      disabled={isMember}
                                      onChange={() => toggleUser(user.id)}
                                      style={styles.checkbox}
                                    />
                                    <span style={styles.userAvatar}>
                                      {user.name.trim()[0]?.toUpperCase() || '?'}
                                    </span>
                                    <span style={isMember ? styles.userNameDisabled : styles.userName}>
                                      {user.name}
                                    </span>
                                    {isMember && <span style={styles.memberBadge}>참여중</span>}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.footer}>
          <span style={styles.selectedCount}>
            {selected.size > 0 ? `${selected.size}명 선택됨` : '선택된 사용자 없음'}
          </span>
          <div style={styles.footerButtons}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              style={{
                ...styles.inviteBtn,
                ...(selected.size === 0 || loading ? styles.inviteBtnDisabled : {}),
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

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10001,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
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
    borderBottom: '1px solid #eee',
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 18, fontWeight: 600, color: '#333' },
  closeBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 20px',
    minHeight: 0,
  },
  loadingText: { color: '#888', fontSize: 14 },
  allCheckRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 0',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    marginBottom: 8,
  },
  allCheckLabel: { fontWeight: 600, fontSize: 15, color: '#333' },
  countBadge: { fontSize: 12, color: '#888', marginLeft: 'auto' },
  treeWrap: {},
  companyBlock: { marginBottom: 12 },
  companyName: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#475569',
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
  deptName: { fontWeight: 600, fontSize: 14, color: '#555' },
  deptCount: { fontSize: 12, color: '#888', marginLeft: 'auto' },
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
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    flexShrink: 0,
  },
  userName: { fontSize: 14, color: '#333' },
  userNameDisabled: { fontSize: 14, color: '#999' },
  memberBadge: {
    fontSize: 11,
    color: '#888',
    background: '#f0f0f0',
    padding: '2px 6px',
    borderRadius: 4,
    marginLeft: 'auto',
  },
  error: {
    color: '#c62828',
    fontSize: 13,
    padding: '0 20px 8px',
    margin: 0,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid #eee',
    flexShrink: 0,
  },
  selectedCount: { fontSize: 13, color: '#666' },
  footerButtons: { display: 'flex', gap: 8 },
  cancelBtn: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    color: '#555',
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
    background: '#cbd5e1',
    cursor: 'not-allowed',
  },
};
