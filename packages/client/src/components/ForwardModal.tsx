import { useQuery } from '@tanstack/react-query';
import { roomsApi, type Room } from '../api';
import { useThemeStore } from '../store';

type Props = {
  onClose: () => void;
  onSelect: (roomId: string) => void;
};

export default function ForwardModal({ onClose, onSelect }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.list,
  });

  const bg = isDark ? '#1e293b' : '#fff';
  const textColor = isDark ? '#e2e8f0' : '#333';
  const subColor = isDark ? '#94a3b8' : '#888';
  const hoverBg = isDark ? '#334155' : '#f5f5f5';
  const borderColor = isDark ? '#475569' : '#f0f0f0';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: bg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 300, maxWidth: '90%', maxHeight: '70vh', overflow: 'auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: textColor }}>전달할 채팅방 선택</h4>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {(rooms as Room[]).map((r) => (
            <li
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(r.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(r.id)}
              style={{ padding: '10px 12px', borderBottom: `1px solid ${borderColor}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: textColor, flexShrink: 0 }}>
                {r.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                {r.lastMessage && (
                  <div style={{ fontSize: 12, color: subColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.lastMessage.content}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} style={{ marginTop: 12, padding: '10px 20px', border: 'none', borderRadius: 8, background: isDark ? '#334155' : '#f0f0f0', color: textColor, fontSize: 14, cursor: 'pointer', width: '100%' }}>
          취소
        </button>
      </div>
    </div>
  );
}
