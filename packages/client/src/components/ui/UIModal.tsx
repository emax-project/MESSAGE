import { useThemeStore } from '../../store';

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  title?: string;
  overlayPosition?: 'fixed' | 'absolute';
  zIndex?: number;
};

export default function UIModal({
  children,
  onClose,
  width = 420,
  title,
  overlayPosition = 'fixed',
  zIndex = 10001,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const st = getStyles(isDark, width, overlayPosition, zIndex);

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={st.header}>
            <h3 style={st.title}>{title}</h3>
            <button type="button" onClick={onClose} style={st.closeBtn} aria-label="닫기">
              ×
            </button>
          </div>
        )}
        <div style={st.body}>{children}</div>
      </div>
    </div>
  );
}

function getStyles(
  isDark: boolean,
  width: number,
  overlayPosition: 'fixed' | 'absolute',
  zIndex: number
): Record<string, React.CSSProperties> {
  return {
    overlay: {
      position: overlayPosition,
      inset: 0,
      zIndex,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modal: {
      background: isDark ? '#1e293b' : '#fff',
      borderRadius: 12,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.15)',
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      width,
      maxWidth: '95vw',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      flexShrink: 0,
    },
    title: { margin: 0, fontSize: 18, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' },
    closeBtn: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      padding: 4,
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 18,
      lineHeight: 1,
    },
    body: { padding: 20, overflow: 'auto', minHeight: 0 },
  };
}

