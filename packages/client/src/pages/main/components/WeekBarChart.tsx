import { cn } from '../../../utils/cn';

export type WeekEventItem = { dateKey: string; label: string; count: number };

type WeekBarChartProps = {
  isDark: boolean;
  data: WeekEventItem[];
};

/** Bar chart for week events - bars aligned to bottom */
export function WeekBarChart({ isDark, data }: WeekBarChartProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const barH = 56;
  return (
    <div className="flex items-end justify-between gap-1" style={{ minHeight: barH + 24 }}>
      {data.map((d) => {
        const h = maxCount > 0 ? (d.count / maxCount) * barH : 0;
        const barHeight = Math.max(h, d.count > 0 ? 4 : 0);
        return (
          <div key={d.dateKey} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full flex flex-col justify-end items-center" style={{ height: barH }}>
              <div
                className={cn('w-6 rounded-t shrink-0 transition-all', d.count > 0 ? 'bg-brand-dark' : isDark ? 'bg-slate-700' : 'bg-slate-200')}
                style={{ height: barHeight }}
              />
            </div>
            <span className="text-[10px] font-medium truncate w-full text-center text-slate-500">
              {d.label}
            </span>
            {d.count > 0 && (
              <span className="text-[10px] font-bold text-brand-dark">{d.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
