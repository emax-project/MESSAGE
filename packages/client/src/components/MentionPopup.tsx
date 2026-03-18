import { useThemeStore } from '../store';
import type { User } from '../api';
import { getThemeTokens } from './ui/themeTokens';

type Props = {
  members: User[];
  query: string;
  onSelect: (name: string) => void;
};

export default function MentionPopup({ members, query, onSelect }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const safeMembers = Array.isArray(members) ? members : [];
  const filtered = safeMembers.filter((m) =>
    m?.name?.toLowerCase?.().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  const t = getThemeTokens(isDark);
  const bg = t.bgSurface;
  const textColor = t.text;
  const borderColor = t.border;
  const hoverBg = t.bgMuted;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: 4,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        padding: 4,
        maxHeight: 200,
        overflow: 'auto',
        minWidth: 180,
        zIndex: 100,
      }}
    >
      {filtered.slice(0, 10).map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.name)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 10px',
            border: 'none',
            background: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            textAlign: 'left',
            color: textColor,
            fontSize: 13,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: textColor, flexShrink: 0 }}>
            {m.name[0]?.toUpperCase()}
          </span>
          <span>@{m.name}</span>
        </button>
      ))}
    </div>
  );
}
