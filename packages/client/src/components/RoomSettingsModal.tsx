import { useState } from 'react';
import { useThemeStore, useToastStore } from '../store';
import { roomsApi, type Room } from '../api';
import UIButton from './ui/UIButton';
import UIModal from './ui/UIModal';
import ModalFooter from './ui/ModalFooter';
import { cn } from '../utils/cn';

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

  const tabBtn = (tab: 'profile' | 'view', label: string) => {
    const active = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={cn(
          'flex-1 border-none rounded-full px-2.5 py-1.5 text-[13px] font-semibold cursor-pointer',
          active
            ? cn(
                isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800',
                isDark ? 'shadow-[0_0_0_1px_#4b5563]' : 'shadow-[0_0_0_1px_#e2e8f0]',
              )
            : cn('bg-transparent', isDark ? 'text-slate-400' : 'text-slate-500'),
        )}
      >
        {label}
      </button>
    );
  };

  const viewRadio = (mode: 'chat' | 'board', title: string, desc: string) => {
    const selected = viewMode === mode;
    return (
      <label
        className={cn(
          'flex-1 flex items-center gap-2 p-3 rounded-[10px] border-2 cursor-pointer',
          selected
            ? cn(isDark ? 'border-blue-400 bg-blue-400/10' : 'border-blue-600 bg-blue-600/[0.06]')
            : cn(isDark ? 'border-slate-700' : 'border-slate-200', 'bg-transparent'),
        )}
      >
        <input
          type="radio"
          name="viewMode"
          checked={selected}
          onChange={() => setViewMode(mode)}
          className="w-4 h-4"
        />
        <div className="flex flex-col gap-0.5">
          <span className={cn('text-sm font-semibold', isDark ? 'text-slate-100' : 'text-slate-800')}>
            {title}
          </span>
          <span className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {desc}
          </span>
        </div>
      </label>
    );
  };

  return (
    <>
      <UIModal title="방 설정" onClose={onClose} width={440}>
            {/* 탭 */}
            <div className={cn('flex gap-1.5 p-1 rounded-full mb-4', isDark ? 'bg-slate-900' : 'bg-slate-50')}>
              {tabBtn('profile', '프로필')}
              {tabBtn('view', '보기 설정')}
            </div>

            {/* 프로필 탭 */}
            {activeTab === 'profile' && (
              <div>
                <div className="mb-4">
                  <label className={cn('text-sm font-semibold block mb-1', isDark ? 'text-slate-100' : 'text-slate-800')}>
                    방 이름
                  </label>
                  <div
                    className={cn(
                      'text-sm px-2.5 py-2 rounded-lg border',
                      isDark ? 'text-slate-400 border-slate-700 bg-slate-950' : 'text-slate-500 border-slate-200 bg-slate-50',
                    )}
                  >
                    {room.name || '이름이 설정되지 않은 방'}
                  </div>
                </div>

              </div>
            )}

            {/* 보기 설정 탭 */}
            {activeTab === 'view' && (
              <div>
                <div className="mb-2">
                  <label className={cn('text-sm font-semibold block mb-1.5', isDark ? 'text-slate-100' : 'text-slate-800')}>
                    보기 모드
                  </label>
                  <p className={cn('mt-0 mb-2.5 text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    채팅방을 기본으로 어떤 방식으로 열지 선택합니다. 변경 사항은 저장 버튼을 눌렀을 때 적용됩니다.
                  </p>
                  <div className="flex gap-3">
                    {viewRadio('chat', '챗뷰', '실시간 메시지 중심의 대화에 적합')}
                    {viewRadio('board', '보드뷰', '게시글·티켓 형태로 정리된 뷰')}
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
    </>
  );
}
