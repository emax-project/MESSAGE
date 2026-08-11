import { cn } from '../utils/cn';
import {
  electronDragStyle,
  electronNoDragStyle,
  isMacElectron,
  MAC_TOP_INSET,
  MAC_TRAFFIC_LIGHTS_WIDTH,
} from '../utils/electronChrome';

/** macOS Electron: 트래픽 라이트 아래 여백 + 드래그/클릭 구역 분리 */
export default function MacTitleBarInset({ isDark }: { isDark: boolean }) {
  if (!isMacElectron()) return null;

  return (
    <div
      className={cn('relative shrink-0 w-full electron-drag', isDark ? 'bg-slate-900' : 'bg-white')}
      style={{ height: MAC_TOP_INSET, ...electronDragStyle }}
      aria-hidden
    >
      <div
        className="electron-no-drag absolute left-0 top-0"
        style={{ ...electronNoDragStyle, width: MAC_TRAFFIC_LIGHTS_WIDTH, height: MAC_TOP_INSET }}
      />
    </div>
  );
}
