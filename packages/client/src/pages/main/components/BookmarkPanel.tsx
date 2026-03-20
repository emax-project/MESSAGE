import { memo } from 'react';
import UICloseButton from '../../../components/ui/UICloseButton';
import { cn } from '../../../utils/cn';

type BookmarkMessage = {
  room?: { id?: string; name?: string };
  sender?: { name?: string };
  content?: string;
  createdAt?: string;
  fileUrl?: string | null;
  fileName?: string | null;
};

export type BookmarkItem = {
  id: string;
  messageId: string;
  message?: BookmarkMessage;
};

type BookmarkPanelProps = {
  isDark: boolean;
  bookmarks: BookmarkItem[];
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  onSelectBookmark: (bookmark: BookmarkItem) => void;
  onRemoveBookmark: (bookmark: BookmarkItem) => void | Promise<void>;
};

function BookmarkPanel({
  isDark,
  bookmarks,
  panelWrapStyle,
  onSelectBookmark,
  onRemoveBookmark,
}: BookmarkPanelProps) {
  const wrap = panelWrapStyle(760);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}><h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>북마크</h3></div>
      <div className="flex-1 min-h-0 overflow-auto">
        {bookmarks.length === 0 ? (
          <div className={cn('p-8 text-center text-sm', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>채팅에서 메시지를 북마크하세요</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bookmarks.map((b) => (
              <li key={b.id} className="px-5 py-3 border-b cursor-pointer flex items-stretch gap-3">
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, display: 'flex', flex: 1, minWidth: 0, textAlign: 'left' }}
                  onClick={() => onSelectBookmark(b)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>{b.message?.sender?.name || '알 수 없음'}</span>
                      <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>{b.message?.room?.name || ''}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.message?.fileUrl ? `[파일] ${b.message.fileName || '파일'}` : (b.message?.content || '')}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>{b.message?.createdAt ? new Date(b.message.createdAt).toLocaleString('ko-KR') : ''}</div>
                  </div>
                </button>
                <UICloseButton
                  size="sm"
                  title="북마크 해제"
                  aria-label="북마크 해제"
                  style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                  onClick={() => void onRemoveBookmark(b)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(BookmarkPanel);
