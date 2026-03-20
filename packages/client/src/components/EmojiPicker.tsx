import { useThemeStore } from '../store';
import { getThemeTokens } from './ui/themeTokens';

const QUICK_EMOJIS = ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\u2705'];

type Props = {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** 내 메시지일 때 true → 채팅 하단에 표시. false → 채팅 상단(위)에 표시 */
  anchorBelow?: boolean;
};

export default function EmojiPicker({ onSelect, onClose, anchorBelow = false }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getThemeTokens(isDark);
  const bg = t.bgSurface;
  const borderColor = t.border;

  const hoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  return (
    <div
      style={{
        position: 'absolute',
        ...(anchorBelow
          ? { top: '100%', right: 0, marginTop: 4 }
          : { bottom: '100%', left: 0, marginBottom: 4 }),
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: 7,
        display: 'flex',
        gap: 0,
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
            background: 'transparent',
            fontSize: 21,
            cursor: 'pointer',
            padding: '5px 7px',
            borderRadius: 6,
            lineHeight: 1,
            transition: 'background 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
