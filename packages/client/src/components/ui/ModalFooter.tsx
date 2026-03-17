import { useThemeStore } from '../../store';

type Props = {
  children: React.ReactNode;
  justify?: React.CSSProperties['justifyContent'];
  bordered?: boolean;
  marginTop?: number;
  paddingTop?: number;
  style?: React.CSSProperties;
};

export default function ModalFooter({
  children,
  justify = 'flex-end',
  bordered = false,
  marginTop = 8,
  paddingTop = 0,
  style,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify,
        gap: 8,
        marginTop,
        paddingTop,
        borderTop: bordered ? `1px solid ${borderColor}` : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
