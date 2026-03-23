import { cn } from '../../../utils/cn';

/** Theme-aware styles for Dashboard */
export function dashboardStyles(isDark: boolean) {
  return {
    card: cn(
      'rounded-xl border p-3 transition-colors',
      isDark ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-slate-200 shadow-sm'
    ),
    stat: cn(
      'rounded-lg px-2.5 py-1.5 flex items-center gap-2',
      isDark ? 'bg-slate-700/80' : 'bg-slate-50'
    ),
    heading: cn('text-[13px] font-bold', isDark ? 'text-slate-200' : 'text-slate-900'),
    headingLg: cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900'),
    statValue: (highlight = false) =>
      cn(
        'text-base font-bold',
        highlight ? 'text-brand-dark' : isDark ? 'text-slate-200' : 'text-slate-800'
      ),
    statLabel: cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500'),
    body: cn('text-[12px]', isDark ? 'text-slate-400' : 'text-slate-500'),
    bodyMuted: cn('text-[12px]', isDark ? 'text-slate-500' : 'text-slate-400'),
    subtitle: cn('text-[12px]', isDark ? 'text-slate-300' : 'text-slate-700'),
    eventItem: cn(
      'flex items-center gap-2 py-2 px-2.5 rounded-lg shrink-0',
      isDark ? 'bg-slate-700/50' : 'bg-slate-50'
    ),
    eventTitle: cn('text-[12px] font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800'),
    ctaCard: cn(
      'rounded-xl border p-3 transition-colors text-center py-4 shrink-0',
      isDark ? 'border-slate-600 bg-slate-800/40' : 'border-slate-200 bg-slate-50/80 shadow-sm'
    ),
    btnLink: cn(
      'text-[11px] font-medium border-none bg-transparent cursor-pointer',
      isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
    ),
  };
}
