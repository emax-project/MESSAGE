import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../store';
import UICloseButton from './ui/UICloseButton';
import { cn } from '../utils/cn';

type Props = {
  mode?: 'create' | 'rename';
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export default function CreateOrgContactGroupModal({
  mode = 'create',
  initialName = '',
  onClose,
  onSubmit,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRename = mode === 'rename';

  useEffect(() => {
    setName(initialName);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('그룹 이름을 입력해주세요');
      return;
    }
    if (isRename && trimmed === initialName.trim()) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRename ? '이름 변경에 실패했습니다.' : '그룹 생성에 실패했습니다.'));
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
        <div className="flex items-center justify-between mb-4">
          <h3
            className={cn('m-0 text-[16px] font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}
          >
            {isRename ? '그룹 이름 변경' : '새 그룹 만들기'}
          </h3>
          <UICloseButton onClick={onClose} />
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div>
            <label
              className={cn('block text-[12px] mb-1.5', isDark ? 'text-slate-400' : 'text-slate-500')}
            >
              그룹 이름
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              maxLength={50}
              placeholder="예: 프로젝트 A"
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-[14px] outline-none box-border',
                isDark
                  ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400',
              )}
            />
          </div>

          {error && (
            <p className="m-0 text-[13px] text-[#c62828]">{error}</p>
          )}

          <div className="flex gap-2 mt-1">
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
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg border-none bg-gradient-to-br from-brand-light to-brand-dark text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
            >
              {loading ? (isRename ? '저장 중...' : '생성 중...') : (isRename ? '저장' : '만들기')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
