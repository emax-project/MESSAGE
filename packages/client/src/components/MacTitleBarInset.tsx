import { cn } from '../utils/cn';
import {
  electronDragStyle,
  electronNoDragStyle,
  isMacElectron,
  MAC_TOP_INSET,
  MAC_TRAFFIC_LIGHTS_WIDTH,
} from '../utils/electronChrome';

type MacTitleBarInsetProps = {
  isDark: boolean;
  /** CSS padding과 함께 쓸 때 absolute 오버레이(드래그·no-drag) */
  overlay?: boolean;
};

/** macOS Electron: 트래픽 라이트 영역 — 창 드래그 + 버튼 클릭 분리 */
export default function MacTitleBarInset({ isDark, overlay = false }: MacTitleBarInsetProps) {
  if (!isMacElectron()) return null;

  return (
    <div
      className={cn(
        'electron-drag z-30',
        overlay ? 'pointer-events-auto absolute top-0 left-0 right-0' : 'relative shrink-0 w-full',
        isDark ? 'bg-slate-900' : 'bg-white',
      )}
      style={{ height: MAC_TOP_INSET, minHeight: MAC_TOP_INSET, flexShrink: 0, ...electronDragStyle }}
      aria-hidden
    >
      <div
        className="electron-no-drag absolute left-0 top-0"
        style={{ ...electronNoDragStyle, width: MAC_TRAFFIC_LIGHTS_WIDTH, height: MAC_TOP_INSET }}
      />
    </div>
  );
}
