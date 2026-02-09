import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type User } from '../api';

type Props = { onSelect: (userId: string) => void; compact?: boolean };

export default function UserPicker({ onSelect, compact }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapRef} style={compact ? styles.wrapCompact : styles.wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={compact ? styles.triggerCompact : styles.trigger}
        aria-label="새 채팅"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {compact ? '+' : '+ 새 채팅'}
      </button>
      {open && (
        <div style={compact ? { ...styles.dropdown, ...styles.dropdownCompact } : styles.dropdown} role="listbox">
          {users.length === 0 ? (
            <p style={styles.empty}>다른 사용자가 없습니다. 회원가입한 사용자와 새 채팅을 만들 수 있습니다.</p>
          ) : (
            users.map((u: User) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u.id);
                  setOpen(false);
                }}
                style={styles.userItem}
              >
                <div style={styles.userAvatar} />
                <div>
                  <span style={styles.userName}>{u.name}</span>
                  <span style={styles.userEmail}>{u.email}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { position: 'relative', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' },
  wrapCompact: { position: 'relative' },
  trigger: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: 10,
    background: '#475569',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
  },
  triggerCompact: {
    width: 30,
    height: 30,
    padding: 0,
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 12,
    right: 12,
    marginTop: 6,
    background: '#fff',
    border: '1px solid #e8e8e8',
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    maxHeight: 280,
    overflow: 'auto',
    zIndex: 10000,
  },
  dropdownCompact: {
    left: 'auto',
    right: 0,
    minWidth: 260,
  },
  empty: { padding: 16, margin: 0, color: '#888', fontSize: 14 },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    gap: 12,
    borderBottom: '1px solid #f5f5f5',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #fae100 0%, #f5d000 100%)',
    flexShrink: 0,
  },
  userName: { display: 'block', fontWeight: 600, fontSize: 14, color: '#333' },
  userEmail: { display: 'block', fontSize: 12, color: '#888', marginTop: 2 },
};
