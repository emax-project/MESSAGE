import type { Dispatch, SetStateAction } from 'react';
import type { Message } from '../../../api';
import UICloseButton from '../../../components/ui/UICloseButton';

type ThreadState = { parentId: string; parent: Message; replies: Message[] } | null;

type ThreadPanelProps = {
  threadOpen: ThreadState;
  setThreadOpen: Dispatch<SetStateAction<ThreadState>>;
  isDark: boolean;
};

export default function ThreadPanel({ threadOpen, setThreadOpen, isDark }: ThreadPanelProps) {
  if (!threadOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setThreadOpen(null)}>
      <div style={{ width: 'min(380px, 100%)', height: '100%', background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>스레드</span>
          <UICloseButton onClick={() => setThreadOpen(null)} />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ padding: 14, borderRadius: 12, background: isDark ? '#334155' : '#f1f5f9', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>{threadOpen.parent.sender?.name}</div>
            <div style={{ fontSize: 14, color: isDark ? '#e2e8f0' : '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {threadOpen.parent.content}
            </div>
            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 6 }}>
              {new Date(threadOpen.parent.createdAt).toLocaleString('ko-KR')}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 10 }}>
            답글 {(threadOpen.replies ?? []).length}개
          </div>
          {(threadOpen.replies ?? []).map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>
                {r.sender?.name?.[0]?.toUpperCase() || '?'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{r.sender?.name}</span>
                  <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>{new Date(r.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontSize: 14, color: isDark ? '#cbd5e1' : '#0f172a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>
              </div>
            </div>
          ))}
          {(threadOpen.replies ?? []).length === 0 && (
            <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 13, marginTop: 20 }}>아직 답글이 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
