/**
 * Electron 창용 툴바. Mac(darwin) / Windows(win32) 레이아웃·스타일 분기.
 * - Mac: 타이틀만 표시 (시스템 트래픽 라이트 사용, 커스텀 버튼 없음)
 * - Windows: 좌측 타이틀 + 우측 최소화/최대화/닫기
 */
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

  const bg = isDark ? '#1e293b' : '#fff';
  const border = isDark ? '#334155' : '#eee';
  const textColor = isDark ? '#e2e8f0' : '#333';

  const baseBar = {
    flexShrink: 0,
    height: 38,
    minHeight: 38,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    gap: 8,
    background: bg,
    borderBottom: `1px solid ${border}`,
    WebkitAppRegion: 'drag',
  } as React.CSSProperties;

  const buttonsWrap = {
    display: 'flex',
    alignItems: 'center',
    gap: isMac ? 8 : 2,
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  const titleStyle: React.CSSProperties = {
    flex: 1,
    textAlign: isMac ? 'center' : 'left',
    fontSize: 13,
    fontWeight: 600,
    color: textColor,
    pointerEvents: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  if (isMac) {
    return (
      <div style={baseBar}>
        <span style={titleStyle}>{title}</span>
      </div>
    );
  }

  // Windows: 타이틀 좌측, 우측에 작은 아이콘 버튼 (최소화 · 최대화 · 닫기)
  const winBtnBg = isDark ? '#3d4451' : '#f0f0f0';
  const winBtnHover = isDark ? '#4b5563' : '#d0d0d0';
  return (
    <>
      <style>{`
        .titlebar-win-btn { transition: background 0.15s ease, color 0.15s ease; }
        .titlebar-win-btn:hover { background: ${winBtnHover} !important; }
        .titlebar-win-btn-close:hover { background: #e81123 !important; color: #fff !important; }
        .titlebar-win-btn-close:hover svg { stroke: #fff; }
      `}</style>
      <div style={baseBar}>
        <span style={{ ...titleStyle, flex: 1, textAlign: 'left' }}>{title}</span>
        <div style={{ ...buttonsWrap, gap: 0, borderRadius: 6, overflow: 'hidden' }}>
          <button
            type="button"
            className="titlebar-win-btn"
            style={winBtnStyle(winBtnBg, textColor)}
            onClick={() => api?.windowMinimize?.()}
            aria-label="최소화"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 5h8" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-win-btn"
            style={winBtnStyle(winBtnBg, textColor)}
            onClick={() => api?.windowMaximize?.()}
            aria-label="최대화"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
            </svg>
          </button>
          <button
            type="button"
            className="titlebar-win-btn titlebar-win-btn-close"
            style={winBtnStyle(winBtnBg, textColor)}
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

function winBtnStyle(bg: string, iconColor: string): React.CSSProperties {
  return {
    width: 36,
    height: 28,
    border: 'none',
    background: bg,
    color: iconColor,
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'none',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
  };
}
