import { cn } from '../../../utils/cn';

/** Theme-aware styles for Dashboard */
export function dashboardStyles(isDark: boolean) {
  return {
    card: cn(
      'rounded-xl border p-3 transition-colors',
      isDark ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-slate-200 shadow-sm'
    ),
    statCard: cn(
      'rounded-xl border p-3 flex flex-col gap-2 min-h-[88px] min-w-0 justify-center transition-colors',
      isDark ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-slate-200 shadow-sm'
    ),
    statCardValue: (highlight = false) =>
      cn(
        'text-2xl font-bold tabular-nums leading-none tracking-tight',
        highlight ? 'text-brand-dark' : isDark ? 'text-slate-200' : 'text-slate-800'
      ),
    heading: cn('text-[13px] font-bold', isDark ? 'text-slate-200' : 'text-slate-900'),
    headingLg: cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900'),
    statLabel: cn('text-[11px] font-medium', isDark ? 'text-slate-400' : 'text-slate-500'),
    body: cn('text-[12px]', isDark ? 'text-slate-400' : 'text-slate-500'),
    bodyMuted: cn('text-[12px]', isDark ? 'text-slate-500' : 'text-slate-400'),
    eventItem: cn(
      'flex items-center gap-2 py-2 px-2.5 rounded-lg shrink-0',
      isDark ? 'bg-slate-700/50' : 'bg-slate-50'
    ),
    eventTitle: cn('text-[12px] font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800'),
    btnLink: cn(
      'text-[11px] font-medium border-none bg-transparent cursor-pointer',
      isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'
    ),
  };
}
