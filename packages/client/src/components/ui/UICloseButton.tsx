import { useThemeStore } from '../../store';

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'inverse';
  variant?: 'ghost' | 'subtle';
};

export default function UICloseButton({
  size = 'md',
  tone = 'default',
  variant = 'ghost',
  style,
  ...rest
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const st = getStyles(isDark, size, tone, variant);
  return (
    <button type="button" aria-label="닫기" {...rest} style={{ ...st.base, ...style }}>
      <svg width={st.iconSize} height={st.iconSize} viewBox="0 0 12 12" fill="none" aria-hidden style={{ display: 'block' }}>
        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function getStyles(
  isDark: boolean,
  size: 'sm' | 'md' | 'lg',
  tone: 'default' | 'inverse',
  variant: 'ghost' | 'subtle'
): { base: React.CSSProperties; iconSize: number } {
  const side = size === 'sm' ? 22 : size === 'lg' ? 32 : 28;
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 14 : 12;
  const color = tone === 'inverse' ? '#ffffff' : isDark ? '#94a3b8' : '#64748b';
  const background =
    variant === 'subtle'
      ? isDark
        ? 'rgba(148,163,184,0.16)'
        : 'rgba(100,116,139,0.1)'
      : 'transparent';

  return {
    iconSize,
    base: {
      width: side,
      height: side,
      minWidth: side,
      minHeight: side,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      borderRadius: 8,
      background,
      color,
      cursor: 'pointer',
      padding: 0,
      lineHeight: 1,
      flexShrink: 0,
    },
  };
}
