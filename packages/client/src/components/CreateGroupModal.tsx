import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, roomsApi, type User } from '../api';

type Props = {
  onClose: () => void;
  onCreated: (roomId: string) => void;
};

export default function CreateGroupModal({ onClose, onCreated }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      if (ids.length === 1) {
        const room = await roomsApi.create(ids[0]);
        onCreated(room.id);
      } else {
        const firstRoom = await roomsApi.create(ids[0]);
        const groupRoom = await roomsApi.addMembers(firstRoom.id, ids.slice(1));
        onCreated(groupRoom.id);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '채팅방 만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>그룹 채팅 만들기</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p style={styles.hint}>함께 대화할 사람을 2명 이상 선택하면 그룹 채팅방이 만들어집니다.</p>
        <div style={styles.body}>
          {usersLoading ? (
            <p style={styles.loadingText}>사용자 목록 로딩 중...</p>
          ) : users.length === 0 ? (
            <p style={styles.loadingText}>초대할 수 있는 사용자가 없습니다.</p>
          ) : (
            <ul style={styles.userList}>
              {users.map((u: User) => (
                <li key={u.id} style={styles.userItem}>
                  <label style={styles.userRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleUser(u.id)}
                      style={styles.checkbox}
                    />
                    <span style={styles.userAvatar}>{u.name.trim()[0]?.toUpperCase() || '?'}</span>
                    <span style={styles.userName}>{u.name}</span>
                    <span style={styles.userEmail}>{u.email}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.footer}>
          <span style={styles.selectedCount}>
            {selected.size > 0 ? `${selected.size}명 선택됨` : '대화할 사람을 선택하세요'}
          </span>
          <div style={styles.footerButtons}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              style={{
                ...styles.createBtn,
                ...(selected.size === 0 || loading ? styles.createBtnDisabled : {}),
              }}
              disabled={selected.size === 0 || loading}
              onClick={handleCreate}
            >
              {loading ? '만드는 중...' : selected.size <= 1 ? '1:1 채팅 만들기' : '그룹 채팅 만들기'}
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
    width: 380,
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
  hint: {
    margin: 0,
    padding: '10px 20px',
    fontSize: 13,
    color: '#666',
    background: '#f8fafc',
    borderBottom: '1px solid #eee',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 20px',
    minHeight: 0,
    maxHeight: 320,
  },
  loadingText: { color: '#888', fontSize: 14, margin: 0 },
  userList: { listStyle: 'none', margin: 0, padding: 0 },
  userItem: { marginBottom: 2 },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 6px',
    borderRadius: 8,
    cursor: 'pointer',
  },
  checkbox: { width: 18, height: 18, cursor: 'pointer', flexShrink: 0 },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    color: '#475569',
    flexShrink: 0,
  },
  userName: { fontSize: 14, fontWeight: 500, color: '#333', flexShrink: 0 },
  userEmail: { fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
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
  createBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: 8,
    background: '#475569',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  createBtnDisabled: {
    background: '#cbd5e1',
    cursor: 'not-allowed',
  },
};
