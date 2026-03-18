import { useThemeStore, useToastStore } from '../../store';
import { getThemeTokens } from './themeTokens';

export default function ToastProvider() {
  const isDark = useThemeStore((s) => s.isDark);
  const { toasts, remove } = useToastStore();
  const theme = getThemeTokens(isDark);

  if (toasts.length === 0) return null;

  const bgInfo = isDark ? '#2a2d31' : '#1f2227';

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 11000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 320,
      }}
    >
      {toasts.map((t) => {
        const bg =
          t.type === 'success'
            ? 'linear-gradient(135deg, #1f9d55 0%, #13795b 100%)'
            : t.type === 'error'
            ? 'linear-gradient(135deg, #de4c5a 0%, #b4233f 100%)'
            : bgInfo;
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 10,
              background: bg,
              color: theme.white,
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              fontSize: 13,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)'}`,
            }}
          >
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#e5e7eb',
                padding: 4,
                fontSize: 14,
              }}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

