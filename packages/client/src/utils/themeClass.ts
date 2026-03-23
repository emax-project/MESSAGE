/**
 * Returns the appropriate class based on theme.
 * Use with cn(): cn(themeClass(isDark, 'bg-slate-50', 'bg-slate-800'))
 */
export function themeClass<T extends string>(isDark: boolean, light: T, dark: T): T {
  return isDark ? dark : light;
}
