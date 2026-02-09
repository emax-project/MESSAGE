import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi, type PinnedMessageItem } from '../api';
import { useThemeStore } from '../store';

type Props = {
  roomId: string;
};

export default function PinnedMessages({ roomId }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['rooms', roomId, 'pins'],
    queryFn: () => roomsApi.getPins(roomId),
    enabled: !!roomId,
  });

  const pins = data?.pins ?? [];

  if (pins.length === 0) return null;

  const bgColor = isDark ? '#1e293b' : '#fffbeb';
  const textColor = isDark ? '#e2e8f0' : '#333';
  const subColor = isDark ? '#94a3b8' : '#92400e';
  const borderColor = isDark ? '#475569' : '#fde68a';

  const handleUnpin = async (messageId: string) => {
    try {
      await roomsApi.unpinMessage(roomId, messageId);
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ borderBottom: `1px solid ${borderColor}`, background: bgColor }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '8px 16px',
          border: 'none',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          fontSize: 13,
          color: subColor,
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 14 }}>{'\uD83D\uDCCC'}</span>
        <span>고정 메시지 {pins.length}개</span>
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>{expanded ? '접기' : '펼치기'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pins.map((p: PinnedMessageItem) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: isDark ? '#334155' : '#fff', border: `1px solid ${borderColor}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: subColor, fontWeight: 600, marginBottom: 2 }}>{p.message.sender.name}</div>
                <div style={{ fontSize: 13, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.message.content}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleUnpin(p.message.id)}
                style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', fontSize: 12, padding: '4px 6px', flexShrink: 0 }}
              >
                해제
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
