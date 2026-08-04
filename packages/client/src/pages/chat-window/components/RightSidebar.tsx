import type { Dispatch, SetStateAction } from 'react';
import { filesApi, type FileInfo, type User } from '../../../api';
import UICloseButton from '../../../components/ui/UICloseButton';
import { RightPanelMembers, RightPanelPins } from '../utils';

type RightPanelType = 'none' | 'file' | 'members' | 'pins';

type RightSidebarProps = {
  isDark: boolean;
  rightPanel: RightPanelType;
  setRightPanel: Dispatch<SetStateAction<RightPanelType>>;
  handleOpenFileDrawer: () => void;
  fileDrawerData: FileInfo[];
  canInvite: boolean;
  setInviteOpen: Dispatch<SetStateAction<boolean>>;
  roomId?: string;
  members: User[];
  panelWidth: number;
  iconWidth: number;
  /** 모바일 셸: 패널을 오버레이로 열어 본문 폭을 유지 */
  overlay?: boolean;
};

export default function RightSidebar({
  isDark,
  rightPanel,
  setRightPanel,
  handleOpenFileDrawer,
  fileDrawerData,
  canInvite,
  setInviteOpen,
  roomId,
  members,
  panelWidth,
  iconWidth,
  overlay = false,
}: RightSidebarProps) {
  const panelOpen = rightPanel !== 'none';
  const totalWidth = panelOpen ? iconWidth + panelWidth : iconWidth;

  return (
    <div
      style={{
        display: 'flex',
        flexShrink: 0,
        width: overlay ? (panelOpen ? totalWidth : iconWidth) : totalWidth,
        borderLeft: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        background: isDark ? '#1e293b' : '#fff',
        transition: 'width 0.2s ease',
        ...(overlay
          ? {
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 20,
              maxWidth: '100%',
              boxShadow: panelOpen
                ? (isDark ? '-8px 0 24px rgba(0,0,0,0.35)' : '-8px 0 24px rgba(0,0,0,0.12)')
                : undefined,
            }
          : {}),
      }}
    >
      <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 4 }}>
        <button
          type="button"
          onClick={handleOpenFileDrawer}
          title="파일함"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: rightPanel === 'file' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: rightPanel === 'file' ? (isDark ? 'var(--color-brand-light)' : 'var(--color-brand-dark)') : (isDark ? '#94a3b8' : '#64748b'),
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setRightPanel((p) => (p === 'members' ? 'none' : 'members'))}
          title="멤버"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: rightPanel === 'members' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: rightPanel === 'members' ? (isDark ? 'var(--color-brand-light)' : 'var(--color-brand-dark)') : (isDark ? '#94a3b8' : '#64748b'),
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setRightPanel((p) => (p === 'pins' ? 'none' : 'pins'))}
          title="고정 메시지"
          style={{
            width: 40,
            height: 40,
            border: 'none',
            background: rightPanel === 'pins' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: rightPanel === 'pins' ? (isDark ? 'var(--color-brand-light)' : 'var(--color-brand-dark)') : (isDark ? '#94a3b8' : '#64748b'),
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      </div>
      {panelOpen && (
        <div
          style={{
            width: panelWidth,
            maxWidth: overlay ? `calc(100% - ${iconWidth}px)` : undefined,
            flex: overlay ? '1 1 auto' : undefined,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            background: isDark ? '#1e293b' : '#fff',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, background: isDark ? '#1e293b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>
              {rightPanel === 'file' && '파일함'}
              {rightPanel === 'members' && '멤버'}
              {rightPanel === 'pins' && '고정 메시지'}
            </span>
            <UICloseButton
              aria-label="패널 닫기"
              size="lg"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRightPanel('none'); }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {rightPanel === 'file' && (
              <>
                {fileDrawerData.length === 0 ? (
                  <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8', fontSize: 14, marginTop: 24 }}>공유된 파일이 없습니다</p>
                ) : (
                  fileDrawerData.map((f) => (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName || 'file'}</div>
                        <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
                          {f.sender.name} · {new Date(f.createdAt).toLocaleDateString('ko-KR')}
                          {f.fileSize != null && ` · ${f.fileSize < 1024 * 1024 ? `${(f.fileSize / 1024).toFixed(0)}KB` : `${(f.fileSize / (1024 * 1024)).toFixed(1)}MB`}`}
                        </div>
                      </div>
                      <button type="button" onClick={() => filesApi.download(f.id, f.fileName)} style={{ border: 'none', background: isDark ? '#334155' : '#f1f5f9', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="다운로드">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
            {rightPanel === 'members' && <RightPanelMembers members={members} isDark={isDark} onInvite={() => setInviteOpen(true)} canInvite={canInvite} />}
            {rightPanel === 'pins' && !!roomId && <RightPanelPins roomId={roomId} isDark={isDark} />}
          </div>
        </div>
      )}
    </div>
  );
}
