import { memo } from 'react';
import type { ReactNode } from 'react';
import UserAvatar from '../../../components/UserAvatar';
import { cn } from '../../../utils/cn';

type StatusOption = { id: string; label: string };

type SettingsPanelProps = {
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  isDark: boolean;
  isNarrowLayout: boolean;
  user: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null; isAdmin?: boolean } | null | undefined;
  notificationsSnoozedUntil: number;
  snoozeNotifications: (minutes: number) => void;
  clearSnooze: () => void;
  toggleDark: () => void;
  hasElectron: boolean;
  appVersion: string | null;
  updateStatus: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' | 'latest';
  updateVersion: string | null;
  updateError: string | null;
  handleCheckForUpdates: () => Promise<void> | void;
  handleQuitAndInstall: () => Promise<void> | void;
  statusInput: string;
  statusOptions: StatusOption[];
  renderStatusIcon: (status: string, size?: number) => ReactNode;
  handleSetStatus: (msg: string) => Promise<void> | void;
  notificationStatus: string;
  announcementEdit: string;
  setAnnouncementEdit: (value: string) => void;
  announcementSaving: boolean;
  onSaveAnnouncement: () => Promise<void>;
  onSelectAvatarFile: (file: File) => void;
  onDeleteAvatar: () => Promise<void>;
  onTestNotification: () => void;
  onRequestNotificationPermission: () => Promise<void> | void;
  onLogout: () => void;
};

function SettingsPanel({
  panelWrapStyle,
  isDark,
  isNarrowLayout,
  user,
  notificationsSnoozedUntil,
  snoozeNotifications,
  clearSnooze,
  toggleDark,
  hasElectron,
  appVersion,
  updateStatus,
  updateVersion,
  updateError,
  handleCheckForUpdates,
  handleQuitAndInstall,
  statusInput,
  statusOptions,
  renderStatusIcon,
  handleSetStatus,
  notificationStatus,
  announcementEdit,
  setAnnouncementEdit,
  announcementSaving,
  onSaveAnnouncement,
  onSelectAvatarFile,
  onDeleteAvatar,
  onTestNotification,
  onRequestNotificationPermission,
  onLogout,
}: SettingsPanelProps) {
  const wrap = panelWrapStyle(760);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}><h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-[#161616]')}>설정</h3></div>
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-3" style={{ padding: isNarrowLayout ? 14 : 24 }}>
        <div style={{ padding: '20px 16px', borderRadius: 12, background: isDark ? '#334155' : '#f0f4ff', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, background: isDark ? '#475569' : '#e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user?.avatarUrl ? <UserAvatar userId={user.id} name={user.name || ''} avatarUrlPath={user.avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} initialStyle={{ fontSize: 36, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' }} /> : <span style={{ fontSize: 36, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' }}>{user?.name?.trim()[0]?.toUpperCase() || '?'}</span>}
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b', marginBottom: 4 }}>{user?.name || '사용자'}</div>
            <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>{user?.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            <label style={{ padding: '10px 18px', borderRadius: 10, background: isDark ? '#475569' : '#171717', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              사진 변경
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelectAvatarFile(f); e.target.value = ''; }} />
            </label>
            {user?.avatarUrl && (
              <button type="button" onClick={() => void onDeleteAvatar()} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${isDark ? '#64748b' : '#e2e8f0'}`, background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, cursor: 'pointer' }}>
                사진 삭제
              </button>
            )}
          </div>
        </div>

        {notificationsSnoozedUntil > Date.now() && <div style={{ padding: '6px 10px', borderRadius: 999, background: isDark ? '#171717' : '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>알림 일시 중지 중</div>}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>알림 일시 중지</div>
          {notificationsSnoozedUntil > Date.now() ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8, fontSize: 12, color: isDark ? '#64748b' : '#666' }}>
              <span>해제: {new Date(notificationsSnoozedUntil).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              <button type="button" className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-[#ac67ba] to-[#8b4a99] text-white text-[13px] font-semibold cursor-pointer" onClick={clearSnooze}>해제</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <button type="button" className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-[#ac67ba] to-[#8b4a99] text-white text-[13px] font-semibold cursor-pointer" onClick={() => snoozeNotifications(10)}>10분</button>
              <button type="button" className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-[#ac67ba] to-[#8b4a99] text-white text-[13px] font-semibold cursor-pointer" onClick={() => snoozeNotifications(60)}>1시간</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10, padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: isDark ? '#e2e8f0' : '#333' }}>다크 모드</span>
          <button type="button" onClick={toggleDark} style={{ width: 48, height: 28, borderRadius: 14, border: 'none', background: isDark ? '#171717' : '#e5e7eb', cursor: 'pointer', position: 'relative' as const, padding: 0, flexShrink: 0 }}>
            <span style={{ position: 'absolute' as const, top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>업데이트</h4>
          {hasElectron ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
              <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#666' }}>
                {appVersion ? `현재 버전 v${appVersion}` : '버전 확인 중...'}
                {updateStatus === 'downloading' && updateVersion && ` · 새 버전 v${updateVersion} 다운로드 중`}
                {updateStatus === 'latest' && ' · 최신 버전입니다'}
                {updateStatus === 'error' && updateError && ` · ${updateError}`}
              </span>
              {updateStatus !== 'ready' ? (
                <button type="button" className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-[#ac67ba] to-[#8b4a99] text-white text-[13px] font-semibold cursor-pointer" disabled={updateStatus === 'checking'} onClick={() => void handleCheckForUpdates()}>
                  {updateStatus === 'checking' ? '확인 중...' : '업데이트 확인'}
                </button>
              ) : (
                <button type="button" className="px-4 py-2 border-none rounded-lg bg-[#16a34a] text-white text-[13px] font-semibold cursor-pointer" onClick={() => void handleQuitAndInstall()}>
                  지금 재시작하여 업데이트
                </button>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: isDark ? '#94a3b8' : '#666' }}>업데이트 확인은 데스크톱 앱(.dmg / .exe)에서만 가능합니다.</p>
          )}
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>상태</h4>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
            {statusOptions.map((opt) => {
              const isSelected = statusInput === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void handleSetStatus(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: isSelected ? (isDark ? 'rgba(23,23,23,0.12)' : 'rgba(23,23,23,0.06)') : 'transparent',
                    width: '100%', textAlign: 'left' as const,
                  }}
                >
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${isSelected ? '#171717' : (isDark ? '#64748b' : '#d1d5db')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#171717', display: 'block' }} />}
                  </span>
                  {opt.id ? renderStatusIcon(opt.id, 18) : <span style={{ width: 18, height: 18, display: 'block' }} />}
                  <span style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', fontWeight: isSelected ? 600 : 400 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc', color: isDark ? '#94a3b8' : '#334155', fontSize: 13 }}>알림 상태: {notificationStatus}</div>
        {user?.isAdmin && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: isDark ? '#334155' : '#f8fafc' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>공지 등록</h4>
            <textarea value={announcementEdit} onChange={(e) => setAnnouncementEdit(e.target.value)} placeholder="공지 내용을 입력하세요." style={{ width: '100%', padding: 12, border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, fontSize: 14, lineHeight: 1.5, resize: 'vertical' as const, marginBottom: 10, boxSizing: 'border-box' as const, background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#333' }} rows={3} />
            <button type="button" className="px-4 py-2 border-none rounded-lg bg-gradient-to-br from-[#ac67ba] to-[#8b4a99] text-white text-[13px] font-semibold cursor-pointer" disabled={announcementSaving} onClick={() => void onSaveAnnouncement()}>{announcementSaving ? '저장 중...' : '저장'}</button>
          </div>
        )}

        {hasElectron && <button type="button" className={cn('w-full px-4 py-3 border-none rounded-[10px] text-sm font-semibold cursor-pointer', isDark ? 'bg-slate-700 text-slate-200' : 'bg-[#f0f0f0] text-slate-800')} onClick={onTestNotification}>알림 테스트</button>}
        {!hasElectron && <button type="button" className={cn('w-full px-4 py-3 border-none rounded-[10px] text-sm font-semibold cursor-pointer', isDark ? 'bg-slate-700 text-slate-200' : 'bg-[#f0f0f0] text-slate-800')} onClick={() => void onRequestNotificationPermission()}>알림 권한 요청</button>}
        <button type="button" className={cn('w-full px-4 py-3 border-none rounded-[10px] text-sm font-semibold cursor-pointer text-[#c62828]', isDark ? 'bg-slate-700' : 'bg-[#f0f0f0]')} onClick={onLogout}>로그아웃</button>
      </div>
    </div>
  );
}

export default memo(SettingsPanel);
