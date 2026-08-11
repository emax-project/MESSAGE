/** Electron frameless 창 드래그/트래픽 라이트 유틸 */
import type { CSSProperties } from 'react';

export const MAC_TRAFFIC_LIGHTS_WIDTH = 78;
/** macOS hiddenInset 타이틀바 — 트래픽 라이트 아래 콘텐츠 여백 */
export const MAC_TOP_INSET = 10;
export const MAC_TRAFFIC_LIGHTS_ZONE_HEIGHT = 32;

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function isMacElectron(): boolean {
  return isElectron() && window.electronAPI!.platform === 'darwin';
}

export function isWinElectron(): boolean {
  return isElectron() && window.electronAPI!.platform === 'win32';
}

export const electronDragStyle = { WebkitAppRegion: 'drag' } as CSSProperties;
export const electronNoDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;
