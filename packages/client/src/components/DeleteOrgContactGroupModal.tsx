import { useState } from 'react';
import { useThemeStore } from '../store';
import UICloseButton from './ui/UICloseButton';
import { cn } from '../utils/cn';

type Props = {
  groupName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteOrgContactGroupModal({ groupName, onClose, onConfirm }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '그룹 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10002] bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={cn(
          'rounded-xl shadow-lg w-[360px] max-w-[90%] p-5',
          isDark ? 'bg-slate-800' : 'bg-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className={cn('m-0 text-[16px] font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}
          >
            그룹 삭제
          </h3>
          <UICloseButton onClick={onClose} />
        </div>

        <p className={cn('m-0 mb-4 text-[14px] leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-600')}>
          「{groupName}」 그룹을 삭제할까요?
          <br />
          <span className={cn('text-[12px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
            그룹에 포함된 멤버 목록만 사라지고, 사용자 계정은 유지됩니다.
          </span>
        </p>

        {error && (
          <p className="m-0 mb-3 text-[13px] text-[#c62828]">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex-1 py-2.5 rounded-lg border text-[13px] font-semibold cursor-pointer',
              isDark
                ? 'border-slate-600 bg-transparent text-slate-200'
                : 'border-slate-200 bg-transparent text-slate-700',
            )}
          >
            취소
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleConfirm()}
            className="flex-1 py-2.5 rounded-lg border-none bg-[#c62828] text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
