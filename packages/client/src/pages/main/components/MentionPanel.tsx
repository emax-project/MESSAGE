import { memo } from 'react';
import { cn } from '../../../utils/cn';

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
  isDark: boolean;
  mentions: MentionItem[];
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  onSelectMention: (mention: MentionItem) => void | Promise<void>;
};

function MentionPanel({
  isDark,
  mentions,
  panelWrapStyle,
  onSelectMention,
}: MentionPanelProps) {
  const wrap = panelWrapStyle(760);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}><h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>멘션</h3></div>
      <div className="flex-1 min-h-0 overflow-auto">
        {mentions.length === 0 ? (
          <div className={cn('p-8 text-center text-sm', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>대화에서 @멘션 되면 여기에 표시됩니다</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {mentions.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cn(
                    'px-5 py-3 cursor-pointer flex items-center gap-3 w-full border-none text-left',
                    !m.readAt ? (isDark ? 'bg-[rgba(91,141,239,0.08)]' : 'bg-[rgba(91,141,239,0.04)]') : 'bg-transparent',
                  )}
                  onClick={() => void onSelectMention(m)}
                >
                  {!m.readAt && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#0f172a', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>{m.message?.sender?.name || '알 수 없음'}</span>
                      <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>{m.message?.room?.name || ''}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message?.content || ''}</div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>{m.message?.createdAt ? new Date(m.message.createdAt).toLocaleString('ko-KR') : ''}</div>
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
