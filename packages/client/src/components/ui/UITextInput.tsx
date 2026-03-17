import { useThemeStore } from '../../store';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export default function UITextInput({ error, style, disabled, ...rest }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const st = getStyles(isDark, !!error, !!disabled);
  return <input {...rest} disabled={disabled} style={{ ...st.base, ...style }} />;
}

function getStyles(isDark: boolean, error: boolean, disabled: boolean): Record<string, React.CSSProperties> {
  const border = error ? '#ef4444' : isDark ? '#475569' : '#e2e8f0';
  return {
    base: {
      width: '100%',
      padding: '8px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 14,
      background: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
      opacity: disabled ? 0.8 : 1,
      transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
    },
  };
}

