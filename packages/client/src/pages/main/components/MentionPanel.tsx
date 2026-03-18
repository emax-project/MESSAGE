import { memo } from 'react';
import type { CSSProperties } from 'react';

type MentionMessage = {
  room?: { id?: string; name?: string };
  sender?: { name?: string };
  content?: string;
  createdAt?: string;
};

export type MentionItem = {
  id: string;
  readAt?: string | null;
  message?: MentionMessage;
};

type MentionPanelProps = {
  st: Record<string, CSSProperties>;
  isDark: boolean;
  mentions: MentionItem[];
  panelWrapStyle: (maxWidth: number) => CSSProperties;
  onSelectMention: (mention: MentionItem) => void | Promise<void>;
};

function MentionPanel({
  st,
  isDark,
  mentions,
  panelWrapStyle,
  onSelectMention,
}: MentionPanelProps) {
  return (
    <div style={panelWrapStyle(760)}>
      <div style={st.panelHeader}><h3 style={st.panelTitle}>멘션</h3></div>
      <div style={st.panelBody}>
        {mentions.length === 0 ? (
          <div style={st.panelEmpty}>대화에서 @멘션 되면 여기에 표시됩니다</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {mentions.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  style={{
                    ...st.panelItem,
                    width: '100%',
                    border: 'none',
                    background: !m.readAt ? (isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)') : 'transparent',
                    textAlign: 'left',
                  }}
                  onClick={() => void onSelectMention(m)}
                >
                  {!m.readAt && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#171717', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>{m.message?.sender?.name || '알 수 없음'}</span>
                      <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{m.message?.room?.name || ''}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message?.content || ''}</div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginTop: 2 }}>{m.message?.createdAt ? new Date(m.message.createdAt).toLocaleString('ko-KR') : ''}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(MentionPanel);
