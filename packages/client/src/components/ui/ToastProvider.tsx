import { useThemeStore, useToastStore } from '../../store';

export default function ToastProvider() {
  const isDark = useThemeStore((s) => s.isDark);
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  const bgInfo = isDark ? '#1e293b' : '#111827';

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
            ? '#16a34a'
            : t.type === 'error'
            ? '#dc2626'
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
              color: '#f9fafb',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              fontSize: 13,
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

