/**
 * Electron 창용 타이틀/드래그 영역.
 * - Mac: hiddenInset + 좌측 no-drag(트래픽 라이트) + 드래그 영역 분리
 * - Windows: titleBarOverlay + 우측 시스템 버튼 여백
 */
import { cn } from '../utils/cn';

/** macOS 트래픽 라이트(●●●) 클릭·표시 safe area */
const MAC_TRAFFIC_LIGHTS_WIDTH = 80;

export default function TitleBar({
  title,
  isDark = false,
}: {
  title: string;
  isDark?: boolean;
}) {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const platform = api?.platform ?? 'darwin';
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';

  const barClass = cn(
    'relative shrink-0 h-[38px] min-h-[38px] flex items-center border-b select-none',
    isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200',
  );

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  const titleClass = cn(
    'text-[13px] font-semibold pointer-events-none truncate',
    isDark ? 'text-slate-200' : 'text-slate-900',
  );

  if (isMac) {
    return (
      <div className={cn(barClass, 'pr-3')}>
        <div
          className="h-full shrink-0"
          style={{ ...noDragStyle, width: MAC_TRAFFIC_LIGHTS_WIDTH }}
          aria-hidden
        />
        <div className="flex flex-1 items-center justify-center min-w-0" style={dragStyle}>
          <span className={cn(titleClass, 'text-center max-w-full')}>{title}</span>
        </div>
      </div>
    );
  }

  if (isWin) {
    return (
      <div className={cn(barClass, 'pl-3 pr-[136px]')} style={dragStyle}>
        <span className={titleClass}>{title}</span>
      </div>
    );
  }

  const winBtnClass = cn(
    'w-9 h-7 border-none cursor-pointer p-0 flex items-center justify-center shadow-none outline-none appearance-none transition-[background,color] duration-150',
    isDark ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  );
  const closeBtnClass = cn(winBtnClass, 'hover:!bg-[#e81123] hover:!text-white');

  return (
    <div className={cn(barClass, 'px-3 gap-2')} style={dragStyle}>
      <span className={cn(titleClass, 'flex-1 text-left')}>{title}</span>
      <div
        className="flex items-center gap-0 rounded-md overflow-hidden"
        style={noDragStyle}
      >
        <button type="button" className={winBtnClass} onClick={() => api?.windowMinimize?.()} aria-label="최소화">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 5h8" />
          </svg>
        </button>
        <button type="button" className={winBtnClass} onClick={() => api?.windowMaximize?.()} aria-label="최대화">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
          </svg>
        </button>
        <button type="button" className={closeBtnClass} onClick={() => api?.windowClose?.()} aria-label="닫기">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 1l8 8M9 1L1 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
