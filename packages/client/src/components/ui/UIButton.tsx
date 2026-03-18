import { useThemeStore } from '../../store';
import { getThemeTokens } from './themeTokens';

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
  const t = getThemeTokens(isDark);
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
      background: disabled ? (isDark ? '#334155' : '#cbd5e1') : t.gradientPrimary,
      color: t.white,
      boxShadow: disabled ? 'none' : (isDark ? '0 4px 14px rgba(154,88,168,0.32)' : '0 4px 12px rgba(154,88,168,0.24)'),
    },
    secondary: {
      background: isDark ? '#334155' : '#f1f5f9',
      color: t.text,
      border: `1px solid ${t.border}`,
    },
    ghost: {
      background: 'transparent',
      color: t.text,
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

