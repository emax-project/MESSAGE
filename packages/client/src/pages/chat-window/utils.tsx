import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { roomsApi, type Message, type PinnedMessageItem, type User } from '../../api';

const EDIT_LIMIT_MS = 5 * 60 * 1000;

export function isSystemMessage(content: string): boolean {
  return /님이\s.+님을\s초대했습니다$/.test(content) || content === '[파일 만료됨]' || /님이 채팅방을 나갔습니다$/.test(content);
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

export function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function canEditOrDelete(msg: Message, myId?: string): boolean {
  if (!myId || msg.senderId !== myId || msg.deletedAt) return false;
  return Date.now() - new Date(msg.createdAt).getTime() < EDIT_LIMIT_MS;
}

export function RightPanelMembers({
  members,
  isDark,
  onInvite,
  canInvite = true,
}: {
  members: User[];
  isDark: boolean;
  onInvite: () => void;
  canInvite?: boolean;
}) {
  const safeMembers = Array.isArray(members) ? members : [];
  return (
    <>
      {canInvite && (
        <button
          type="button"
          onClick={onInvite}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            border: 'none',
            background: isDark ? '#334155' : '#f1f5f9',
            color: isDark ? '#94a3b8' : '#475569',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          초대하기
        </button>
      )}
      {safeMembers.length === 0 ? (
        <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>멤버가 없습니다</p>
      ) : (
        safeMembers.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>
              {m.name?.trim()?.[0]?.toUpperCase() || '?'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{m.name}</div>
              {m.email && <div style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' }}>{m.email}</div>}
            </div>
          </div>
        ))
      )}
    </>
  );
}

export function RightPanelPins({ roomId, isDark }: { roomId: string; isDark: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['rooms', roomId, 'pins'],
    queryFn: () => roomsApi.getPins(roomId),
    enabled: !!roomId,
  });
  const pins = data?.pins ?? [];

  const handleUnpin = async (messageId: string) => {
    try {
      await roomsApi.unpinMessage(roomId, messageId);
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    } catch (err) {
      console.error(err);
    }
  };

  if (pins.length === 0) {
    return <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 14, marginTop: 24 }}>고정된 메시지가 없습니다</p>;
  }

  return (
    <>
      {pins.map((p: PinnedMessageItem) => (
        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>{p.message.sender.name}</span>
            <button type="button" onClick={() => handleUnpin(p.message.id)} style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', fontSize: 11, padding: '2px 6px', flexShrink: 0 }}>
              해제
            </button>
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 48 }}>
            {p.message.content}
          </div>
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>{new Date(p.message.createdAt).toLocaleString('ko-KR')}</div>
        </div>
      ))}
    </>
  );
}

// 프로토콜 있는 URL + 도메인만(naver.com, www.google.com 등) + @멘션
const LINK_SPLIT_REGEX = /(https?:\/\/[^\s<>"']+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}|@\S+)/gi;

function renderLink(key: number, href: string, label: string, linkColor: string): ReactNode {
  const openExternal = window.electronAPI?.openExternal;
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all', cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        if (openExternal) {
          e.preventDefault();
          openExternal(href);
        }
      }}
    >
      {label}
    </a>
  );
}

export function renderContentWithMentions(content: string, isDark: boolean): ReactNode {
  const parts = content.split(LINK_SPLIT_REGEX);
  const linkColor = isDark ? '#7CA5FF' : '#5B8DEF';
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      const href = part.replace(/[.,;:!?)]+$/, '');
      return renderLink(i, href, part, linkColor);
    }
    if (
      /^(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}$/i.test(part) &&
      !/\.(?:pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx|zip|txt|pptx|hwp)$/i.test(part)
    ) {
      const href = part.replace(/[.,;:!?)]+$/, '');
      const url = href.startsWith('http') ? href : `https://${href}`;
      return renderLink(i, url, part, linkColor);
    }
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: linkColor, fontWeight: 600 }}>{part}</span>;
    }
    return part;
  });
}
