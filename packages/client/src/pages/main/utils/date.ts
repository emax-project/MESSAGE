export function toLocalInputValue(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function dateKeyWithTime(dateKey: string, time: string): string {
  return dateKey ? `${dateKey}T${time}` : '';
}

export function normalizeTimeRange(dateKey: string, start?: string, end?: string) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const baseStart = dateKeyWithTime(dateKey, '09:00');
  const baseEnd = dateKeyWithTime(dateKey, '10:00');
  if (!s || Number.isNaN(s.getTime()) || !e || Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) {
    return { startAt: baseStart, endAt: baseEnd };
  }
  return {
    startAt: dateKeyWithTime(dateKey, toLocalInputValue(s.toISOString()).slice(11)),
    endAt: dateKeyWithTime(dateKey, toLocalInputValue(e.toISOString()).slice(11)),
  };
}
