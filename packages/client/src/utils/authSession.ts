/**
 * 로그인 토큰 저장소.
 * Electron에서는 OS 암호화 API(Windows DPAPI / macOS Keychain 기반 safeStorage)로
 * 암호화한 파일에 저장하고, 평문 localStorage에는 남기지 않는다.
 * (기존에 localStorage에 저장돼 있던 토큰은 첫 조회 때 1회 자동 이전 후 삭제)
 * 웹/모바일 브라우저 등 Electron이 아닌 환경은 기존처럼 localStorage를 쓴다.
 */

const TOKEN_KEY = 'token';

function api() {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
}

export function getStoredToken(): string | null {
  try {
    const a = api();
    if (a?.readTokenSync) {
      const secure = a.readTokenSync();
      if (secure) return secure;
      const legacy = localStorage.getItem(TOKEN_KEY);
      if (legacy) {
        a.writeToken?.(legacy).catch(() => {});
        localStorage.removeItem(TOKEN_KEY);
        return legacy;
      }
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    const a = api();
    if (a?.writeToken) {
      a.writeToken(token).catch(() => {});
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function removeStoredToken(): void {
  try {
    api()?.clearToken?.().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
