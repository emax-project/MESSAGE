import type { ReactNode } from 'react';
import { useThemeStore } from '../store';
import MacTitleBarInset from './MacTitleBarInset';
import { cn } from '../utils/cn';
import { isMacElectron } from '../utils/electronChrome';

const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

/** 칸반·간트·독립 채팅 등 보조 Electron 창 레이아웃 */
export default function ElectronSecondaryShell({ children }: { children: ReactNode }) {
  const isDark = useThemeStore((s) => s.isDark);

  if (!isElectron) return <>{children}</>;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full flex-col',
        isMacElectron() && 'electron-mac-window',
        isDark ? 'bg-slate-900' : 'bg-white',
      )}
    >
      {isMacElectron() && <MacTitleBarInset isDark={isDark} overlay />}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
