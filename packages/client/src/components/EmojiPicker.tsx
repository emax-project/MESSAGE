import { useThemeStore } from '../store';

const QUICK_EMOJIS = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\u2705'];

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const bg = isDark ? '#334155' : '#fff';
  const borderColor = isDark ? '#475569' : '#e5e7eb';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        marginBottom: 4,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: 6,
        display: 'flex',
        gap: 2,
        zIndex: 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onSelect(emoji); onClose(); }}
          style={{
            border: 'none',
            background: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 6,
            lineHeight: 1,
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
