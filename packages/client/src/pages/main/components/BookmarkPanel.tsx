import { memo } from 'react';
import type { CSSProperties } from 'react';
import UICloseButton from '../../../components/ui/UICloseButton';

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
  st: Record<string, CSSProperties>;
  isDark: boolean;
  bookmarks: BookmarkItem[];
  panelWrapStyle: (maxWidth: number) => CSSProperties;
  onSelectBookmark: (bookmark: BookmarkItem) => void;
  onRemoveBookmark: (bookmark: BookmarkItem) => void | Promise<void>;
};

function BookmarkPanel({
  st,
  isDark,
  bookmarks,
  panelWrapStyle,
  onSelectBookmark,
  onRemoveBookmark,
}: BookmarkPanelProps) {
  return (
    <div style={panelWrapStyle(760)}>
      <div style={st.panelHeader}><h3 style={st.panelTitle}>북마크</h3></div>
      <div style={st.panelBody}>
        {bookmarks.length === 0 ? (
          <div style={st.panelEmpty}>채팅에서 메시지를 북마크하세요</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {bookmarks.map((b) => (
              <li key={b.id} style={{ ...st.panelItem, alignItems: 'stretch' }}>
                <button
                  type="button"
                  style={{ border: 'none', background: 'transparent', padding: 0, margin: 0, display: 'flex', flex: 1, minWidth: 0, textAlign: 'left' }}
                  onClick={() => onSelectBookmark(b)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>{b.message?.sender?.name || '알 수 없음'}</span>
                      <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>{b.message?.room?.name || ''}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.message?.fileUrl ? `[파일] ${b.message.fileName || '파일'}` : (b.message?.content || '')}
                    </div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginTop: 2 }}>{b.message?.createdAt ? new Date(b.message.createdAt).toLocaleString('ko-KR') : ''}</div>
                  </div>
                </button>
                <UICloseButton
                  size="sm"
                  title="북마크 해제"
                  aria-label="북마크 해제"
                  style={{ color: isDark ? '#64748b' : '#9ca3af' }}
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
