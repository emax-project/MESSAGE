/** Electron frameless 창 드래그/트래픽 라이트 유틸 */
import type { CSSProperties } from 'react';

export const MAC_TRAFFIC_LIGHTS_WIDTH = 78;
/** macOS hiddenInset — 트래픽 라이트(≈y14+12px) 아래까지 콘텐츠를 내리는 상단 여백 */
export const MAC_TOP_INSET = 32;
export const MAC_TRAFFIC_LIGHTS_ZONE_HEIGHT = 32;
/** macOS: 트래픽 라이트(최대 ~78px)가 사이드바 안에 들어가도록 */
export const MAC_SIDEBAR_WIDTH = MAC_TRAFFIC_LIGHTS_WIDTH;

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
