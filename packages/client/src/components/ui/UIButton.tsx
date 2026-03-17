import { useThemeStore } from '../../store';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function UIButton({
  variant = 'secondary',
  size = 'md',
  disabled,
  style,
  children,
  ...rest
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const st = getStyles(isDark, variant, size, !!disabled);
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ...st.base, ...style }}
    >
      {children}
    </button>
  );
}

function getStyles(isDark: boolean, variant: Variant, size: Size, disabled: boolean): Record<string, React.CSSProperties> {
  const sizes: Record<Size, React.CSSProperties> = {
    sm: { padding: '8px 12px', fontSize: 13, borderRadius: 8 },
    md: { padding: '10px 16px', fontSize: 14, borderRadius: 10 },
  };

  const base: React.CSSProperties = {
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
    userSelect: 'none',
    opacity: disabled ? 0.85 : 1,
  };

  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: disabled ? (isDark ? '#334155' : '#cbd5e1') : '#475569',
      color: '#fff',
    },
    secondary: {
      background: isDark ? '#334155' : '#f1f5f9',
      color: isDark ? '#e2e8f0' : '#475569',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
    },
    ghost: {
      background: 'transparent',
      color: isDark ? '#e2e8f0' : '#475569',
    },
    danger: {
      background: disabled ? (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.15)') : '#ef4444',
      color: '#fff',
    },
  };

  return {
    base: {
      ...base,
      ...sizes[size],
      ...variants[variant],
    },
  };
}

