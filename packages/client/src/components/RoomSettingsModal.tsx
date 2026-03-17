import { useState, useRef } from 'react';
import { useThemeStore, useToastStore } from '../store';
import { roomsApi, type Room } from '../api';
import AvatarEditModal from './AvatarEditModal';
import RoomAvatar from './RoomAvatar';
import UIButton from './ui/UIButton';
import UIModal from './ui/UIModal';
import ModalFooter from './ui/ModalFooter';

type Props = {
  room: Room;
  onClose: () => void;
  onUpdated: () => void;
};

export default function RoomSettingsModal({ room, onClose, onUpdated }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);
  const [activeTab, setActiveTab] = useState<'profile' | 'view'>('profile');
  const [viewMode, setViewMode] = useState<'chat' | 'board'>(room.viewMode === 'board' ? 'board' : 'chat');
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) setAvatarFile(f);
    e.target.value = '';
  };

  const handleAvatarConfirm = async (croppedFile: File) => {
    try {
      await roomsApi.uploadAvatar(room.id, croppedFile);
      setAvatarFile(null);
      onUpdated();
      showToast('프로필 사진이 변경되었습니다.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '프로필 사진 업로드 실패', 'error');
    }
  };

  const handleViewModeSave = async () => {
    if (viewMode === (room.viewMode === 'board' ? 'board' : 'chat')) return;
    setSaving(true);
    try {
      await roomsApi.updateViewMode(room.id, viewMode);
      onUpdated();
      showToast('보기 모드가 저장되었습니다.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '설정 저장 실패', 'error');
    } finally {
      setSaving(false);
    }
  };

  const viewModeChanged = viewMode !== (room.viewMode === 'board' ? 'board' : 'chat');
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f1f5f9' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const tabBg = isDark ? '#0f172a' : '#f9fafb';
  const tabActiveBg = isDark ? '#111827' : '#ffffff';
  const tabActiveBorder = isDark ? '#4b5563' : '#e5e7eb';

  return (
    <>
      <UIModal title="방 설정" onClose={onClose} width={440}>
            {/* 탭 */}
            <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 999, background: tabBg, marginBottom: 16 }}>
              <button type="button" onClick={() => setActiveTab('profile')} style={{ flex: 1, border: 'none', borderRadius: 999, padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: activeTab === 'profile' ? tabActiveBg : 'transparent', color: activeTab === 'profile' ? text : muted, boxShadow: activeTab === 'profile' ? `0 0 0 1px ${tabActiveBorder}` : 'none' }}>
                프로필
              </button>
              <button type="button" onClick={() => setActiveTab('view')} style={{ flex: 1, border: 'none', borderRadius: 999, padding: '6px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: activeTab === 'view' ? tabActiveBg : 'transparent', color: activeTab === 'view' ? text : muted, boxShadow: activeTab === 'view' ? `0 0 0 1px ${tabActiveBorder}` : 'none' }}>
                보기 설정
              </button>
            </div>

            {/* 프로필 탭 */}
            {activeTab === 'profile' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: text, display: 'block', marginBottom: 4 }}>방 이름</label>
                  <div style={{ fontSize: 14, color: muted, padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#020617' : '#f8fafc' }}>
                    {room.name || '이름이 설정되지 않은 방'}
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: text, display: 'block', marginBottom: 8 }}>프로필 사진</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 12,
                        background: isDark ? '#334155' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <RoomAvatar
                        roomId={room.id}
                        name={room.name || '채팅방'}
                        initials={room.initials}
                        hasAvatar={!!room.avatarUrl}
                        avatarUrlPath={room.avatarUrl}
                        imgStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        initialStyle={{ fontSize: 24, fontWeight: 700, color: muted }}
                      />
                    </div>
                    <div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? '#334155' : '#f1f5f9', color: text, fontSize: 13, cursor: 'pointer' }}
                      >
                        사진 변경
                      </button>
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: muted }}>
                        사진 변경은 즉시 적용되며 아래 보기 모드 설정과는 별도로 저장됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 보기 설정 탭 */}
            {activeTab === 'view' && (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: text, display: 'block', marginBottom: 6 }}>보기 모드</label>
                  <p style={{ margin: '0 0 10px', fontSize: 12, color: muted }}>
                    채팅방을 기본으로 어떤 방식으로 열지 선택합니다. 변경 사항은 저장 버튼을 눌렀을 때 적용됩니다.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, border: `2px solid ${viewMode === 'chat' ? (isDark ? '#60a5fa' : '#2563eb') : border}`, background: viewMode === 'chat' ? (isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.06)') : 'transparent', cursor: 'pointer' }}>
                      <input type="radio" name="viewMode" checked={viewMode === 'chat'} onChange={() => setViewMode('chat')} style={{ width: 16, height: 16 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: text }}>챗뷰</span>
                        <span style={{ fontSize: 12, color: muted }}>실시간 메시지 중심의 대화에 적합</span>
                      </div>
                    </label>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, border: `2px solid ${viewMode === 'board' ? (isDark ? '#60a5fa' : '#2563eb') : border}`, background: viewMode === 'board' ? (isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.06)') : 'transparent', cursor: 'pointer' }}>
                      <input type="radio" name="viewMode" checked={viewMode === 'board'} onChange={() => setViewMode('board')} style={{ width: 16, height: 16 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: text }}>보드뷰</span>
                        <span style={{ fontSize: 12, color: muted }}>게시글·티켓 형태로 정리된 뷰</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <ModalFooter bordered={false} marginTop={16}>
              <UIButton variant="secondary" onClick={onClose}>
                닫기
              </UIButton>
              <UIButton
                variant="primary"
                onClick={handleViewModeSave}
                disabled={activeTab !== 'view' || !viewModeChanged || saving}
              >
                {saving ? '저장 중...' : '보기 모드 저장'}
              </UIButton>
            </ModalFooter>
      </UIModal>
      {avatarFile && (
        <AvatarEditModal
          file={avatarFile}
          onClose={() => setAvatarFile(null)}
          onConfirm={handleAvatarConfirm}
        />
      )}
    </>
  );
}
