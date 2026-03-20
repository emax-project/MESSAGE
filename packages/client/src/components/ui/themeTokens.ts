export type UIThemeTokens = {
  bgBase: string;
  bgSurface: string;
  bgMuted: string;
  text: string;
  textStrong: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryStrong: string;
  white: string;
  gradientPrimary: string;
  danger: string;
};

export const uiRadius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
} as const;

export const uiSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** 로고 톤: Deep Blue (#74A0FF, #7CA5FF) */
const BRAND_PRIMARY = '#74A0FF';
const BRAND_PRIMARY_DEEP = '#5B8DEF';
const BRAND_GRADIENT = 'linear-gradient(135deg, #7CA5FF 0%, #5B8DEF 100%)';

/** 푸른색 톤: slate 기반 (blue-gray) */
export function getThemeTokens(isDark: boolean): UIThemeTokens {
  return {
    bgBase: isDark ? '#0f172a' : '#f8fafc',
    bgSurface: isDark ? '#1e293b' : '#ffffff',
    bgMuted: isDark ? '#334155' : '#f1f5f9',
    text: isDark ? '#e2e8f0' : '#0f172a',
    textStrong: isDark ? '#f8fafc' : '#020617',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#475569' : '#e2e8f0',
    primary: BRAND_PRIMARY,
    primaryStrong: BRAND_PRIMARY_DEEP,
    white: '#ffffff',
    gradientPrimary: BRAND_GRADIENT,
    danger: '#ef4444',
  };
}
