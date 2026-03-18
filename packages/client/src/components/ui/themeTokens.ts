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

export function getThemeTokens(isDark: boolean): UIThemeTokens {
  // Slack-inspired accent setup: neutral surfaces + purple highlights.
  // Tuned for clearer UI contrast on dark surfaces (targeting >= 3:1 for key colored UI).
  const slackPurple = '#9a58a8';
  const slackPurpleDeep = '#611f69';
  const white = '#ffffff';
  return {
    bgBase: isDark ? '#1d1c1d' : '#f8f8f8',
    bgSurface: isDark ? '#222529' : '#ffffff',
    bgMuted: isDark ? '#2a2d31' : '#f1f3f5',
    text: isDark ? '#d1d2d3' : '#1d1c1d',
    textStrong: isDark ? '#ffffff' : '#161616',
    textMuted: isDark ? '#a7adb4' : '#5e6470',
    border: isDark ? '#3a3f46' : '#dde1e6',
    primary: slackPurple,
    primaryStrong: slackPurpleDeep,
    white,
    gradientPrimary: 'linear-gradient(135deg, #ac67ba 0%, #8b4a99 100%)',
    danger: '#ef4444',
  };
}
