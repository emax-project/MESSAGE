import type { CSSProperties, ReactNode } from 'react';
import { electronNoDragClass } from './MacElectronDragBar';
import { cn } from '../utils/cn';
import { electronDragStyle, electronNoDragStyle, isMacElectron } from '../utils/electronChrome';

/** 패널 제목 줄 — 모든 패널 동일 높이·패딩 */
export const PANEL_TITLE_ROW =
  'shrink-0 flex items-center justify-between gap-2 h-[52px] min-h-[52px] px-5 border-b';

/** 검색·탭 등 2번째 줄 */
export const PANEL_TOOLBAR_ROW =
  'shrink-0 flex items-center gap-2 h-[48px] min-h-[48px] px-5 border-b';

export function panelHeaderBorder(isDark: boolean) {
  return isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]';
}

type PanelDragHeaderProps = {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** macOS Electron: 패널 상단 드래그 영역 */
export function PanelDragHeader({ className, style, children }: PanelDragHeaderProps) {
  const macDrag = isMacElectron();
  return (
    <div
      className={cn('electron-drag', className)}
      style={{ ...(macDrag ? electronDragStyle : undefined), ...style }}
    >
      {children}
    </div>
  );
}

export function panelTitleClass(isDark: boolean) {
  return cn(
    'm-0 text-base font-bold leading-none pointer-events-none shrink-0 truncate',
    isDark ? 'text-white' : 'text-slate-900',
  );
}

export function usePanelNoDrag() {
  const macDrag = isMacElectron();
  return {
    macDrag,
    noDragClass: macDrag ? electronNoDragClass : undefined,
    noDragStyle: macDrag ? electronNoDragStyle : undefined,
  };
}

type PanelNoDragWrapProps = {
  children: ReactNode;
  className?: string;
};

export function PanelNoDragWrap({ children, className }: PanelNoDragWrapProps) {
  const { noDragClass, noDragStyle } = usePanelNoDrag();
  return (
    <div className={cn(noDragClass, className)} style={noDragStyle}>
      {children}
    </div>
  );
}

type PanelTitleRowProps = {
  isDark: boolean;
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function PanelTitleRow({ isDark, title, left, right }: PanelTitleRowProps) {
  const macDrag = isMacElectron();
  return (
    <div className={cn(PANEL_TITLE_ROW, panelHeaderBorder(isDark))}>
      {left ? (
        <PanelNoDragWrap className="flex shrink-0 items-center">{left}</PanelNoDragWrap>
      ) : null}
      <div
        className={cn('flex min-w-0 flex-1 items-center gap-2', macDrag && 'electron-drag')}
        style={macDrag ? electronDragStyle : undefined}
      >
        {title ? <h3 className={panelTitleClass(isDark)}>{title}</h3> : null}
      </div>
      {right ? (
        <PanelNoDragWrap className="flex shrink-0 items-center gap-2">{right}</PanelNoDragWrap>
      ) : null}
    </div>
  );
}

type PanelToolbarRowProps = {
  isDark: boolean;
  children: ReactNode;
  className?: string;
};

/** 패널 2번째 줄 (검색·탭) — 클릭 가능해야 하므로 drag 영역 사용 안 함 */
export function PanelToolbarRow({ isDark, children, className }: PanelToolbarRowProps) {
  return (
    <div className={cn(PANEL_TOOLBAR_ROW, panelHeaderBorder(isDark), className)}>
      {children}
    </div>
  );
}

export { electronNoDragClass };
