export type UIThemeTokens = {
  bgBase: string;
  bgSurface: string;
  bgMuted: string;
  text: string;
  textStrong: string;
  textMuted: string;
  border: string;
  primary: string;
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

export function getThemeTokens(isDark: boolean): UIThemeTokens {
  return {
    bgBase: isDark ? '#0f172a' : '#f1f5f9',
    bgSurface: isDark ? '#1e293b' : '#ffffff',
    bgMuted: isDark ? '#334155' : '#f8fafc',
    text: isDark ? '#e2e8f0' : '#1e293b',
    textStrong: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    primary: '#475569',
    danger: '#ef4444',
  };
}
