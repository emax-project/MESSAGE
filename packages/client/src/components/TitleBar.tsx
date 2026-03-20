/**
 * Electron 창용 툴바. Mac(darwin) / Windows(win32) 레이아웃·스타일 분기.
 * - Mac: 타이틀만 표시 (시스템 트래픽 라이트 사용, 커스텀 버튼 없음)
 * - Windows: 좌측 타이틀 + 우측 최소화/최대화/닫기
 */
import { cn } from '../utils/cn';

export default function TitleBar({
  title,
  isDark = false,
}: {
  title: string;
  isDark?: boolean;
}) {
  const api = typeof window !== 'undefined' ? (window as Window & { electronAPI?: { platform?: string } }).electronAPI : undefined;
  const platform = api?.platform ?? 'darwin';
  const isMac = platform === 'darwin';

  const barClass = cn(
    'shrink-0 h-[38px] min-h-[38px] flex items-center px-3 gap-2 border-b',
    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200',
  );

  const titleClass = cn(
    'flex-1 text-[13px] font-semibold pointer-events-none truncate',
    isDark ? 'text-slate-200' : 'text-slate-900',
  );

  if (isMac) {
    return (
      <div className={cn(barClass, 'justify-center')} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className={cn(titleClass, 'text-center')}>{title}</span>
      </div>
    );
  }

  const winBtnClass = cn(
    'w-9 h-7 border-none cursor-pointer p-0 flex items-center justify-center shadow-none outline-none appearance-none transition-[background,color] duration-150',
    isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  );

  const closeBtnClass = cn(winBtnClass, 'hover:!bg-[#e81123] hover:!text-white');

  return (
    <>
      <div className={barClass} style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className={cn(titleClass, 'text-left')}>{title}</span>
        <div
          className="flex items-center gap-0 rounded-md overflow-hidden"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            className={winBtnClass}
            onClick={() => api?.windowMinimize?.()}
            aria-label="최소화"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 5h8" />
            </svg>
          </button>
          <button
            type="button"
            className={winBtnClass}
            onClick={() => api?.windowMaximize?.()}
            aria-label="최대화"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
            </svg>
          </button>
          <button
            type="button"
            className={closeBtnClass}
            onClick={() => api?.windowClose?.()}
            aria-label="닫기"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1L1 9" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
