import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type User } from '../api';
import { useThemeStore } from '../store';

type Props = { onSelect: (userId: string) => void; compact?: boolean };

export default function UserPicker({ onSelect, compact }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.isDark);
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

  const st = getPickerStyles(isDark);

  return (
    <div ref={wrapRef} style={compact ? st.wrapCompact : st.wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={compact ? st.triggerCompact : st.trigger}
        aria-label="새 채팅"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {compact ? '+' : '+ 새 채팅'}
      </button>
      {open && (
        <div style={compact ? { ...st.dropdown, ...st.dropdownCompact } : st.dropdown} role="listbox">
          {users.length === 0 ? (
            <p style={st.empty}>다른 사용자가 없습니다. 회원가입한 사용자와 새 채팅을 만들 수 있습니다.</p>
          ) : (
            users.map((u: User) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u.id);
                  setOpen(false);
                }}
                style={st.userItem}
              >
                <div style={st.userAvatar}>{u.name.trim()[0]?.toUpperCase() || '?'}</div>
                <div>
                  <span style={st.userName}>{u.name}</span>
                  <span style={st.userEmail}>{u.email}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function getPickerStyles(isDark: boolean): Record<string, React.CSSProperties> {
  return {
    wrap: { position: 'relative', padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` },
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
      background: isDark ? '#1e293b' : '#fff',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      borderRadius: 12,
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.1)',
      maxHeight: 280,
      overflow: 'auto',
      zIndex: 10000,
    },
    dropdownCompact: {
      left: 'auto',
      right: 0,
      minWidth: 260,
    },
    empty: { padding: 16, margin: 0, color: isDark ? '#94a3b8' : '#888', fontSize: 14 },
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
      borderBottom: `1px solid ${isDark ? '#334155' : '#f1f5f9'}`,
    },
    userAvatar: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: isDark ? '#334155' : '#e2e8f0',
      color: isDark ? '#94a3b8' : '#475569',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      flexShrink: 0,
    },
    userName: { display: 'block', fontWeight: 600, fontSize: 14, color: isDark ? '#e2e8f0' : '#1e293b' },
    userEmail: { display: 'block', fontSize: 12, color: isDark ? '#64748b' : '#888', marginTop: 2 },
  };
}
