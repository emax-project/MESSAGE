import type { CSSProperties } from 'react';

type EmaxLogoVariant = 'dark' | 'light' | 'accent';
type EmaxLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface EmaxLogoProps {
  variant?: EmaxLogoVariant;
  size?: EmaxLogoSize;
  showTagline?: boolean;
  style?: CSSProperties;
}

const SIZE_MAP: Record<EmaxLogoSize, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 30,
  xl: 38,
  '2xl': 56,
};

const LETTER_SPACING_EM = 0.38;
const TAGLINE_TRACKING_EM = 0.42;
const TAGLINE_SCALE = 0.21;
const ACCENT_LINE_SCALE = 0.028;
const BRAND_ACCENT = '#9a58a8';

export function EmaxLogo({
  variant = 'dark',
  size = 'md',
  showTagline = false,
  style,
}: EmaxLogoProps) {
  const fontSize = SIZE_MAP[size];
  const textColor = variant === 'light' ? '#FFFFFF' : '#0F172A';
  const eColor = variant === 'accent' ? BRAND_ACCENT : textColor;
  const taglineColor = variant === 'light' ? 'rgba(255,255,255,0.72)' : '#94A3B8';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', ...style }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Montserrat','Helvetica Neue',Arial,sans-serif",
            fontSize,
            fontWeight: 800,
            letterSpacing: `${LETTER_SPACING_EM}em`,
            textTransform: 'uppercase',
            color: eColor,
            lineHeight: 1,
          }}
        >
          E
        </span>
        <span
          style={{
            fontFamily: "'Montserrat','Helvetica Neue',Arial,sans-serif",
            fontSize,
            fontWeight: 800,
            letterSpacing: `${LETTER_SPACING_EM}em`,
            textTransform: 'uppercase',
            color: textColor,
            lineHeight: 1,
          }}
        >
          MAX
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            bottom: `${-fontSize * 0.16}px`,
            width: `${fontSize * 0.56}px`,
            height: `${Math.max(1, fontSize * ACCENT_LINE_SCALE)}px`,
            background: BRAND_ACCENT,
            borderRadius: 999,
          }}
        />
      </div>

      {showTagline && (
        <span
          style={{
            marginTop: `${fontSize * 0.32}px`,
            marginLeft: `${fontSize * 0.04}px`,
            fontFamily: "'Montserrat','Helvetica Neue',Arial,sans-serif",
            fontSize: `${fontSize * TAGLINE_SCALE}px`,
            fontWeight: 500,
            letterSpacing: `${TAGLINE_TRACKING_EM}em`,
            textTransform: 'uppercase',
            color: taglineColor,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          Efficient Messaging for Agile eXecution
        </span>
      )}
    </div>
  );
}
