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

/** Format event time range as "오전 9:00 – 오후 2:30" */
export function formatEventTime(startAt: string, endAt: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const s = new Date(startAt);
  const e = new Date(endAt);
  const sh = s.getHours();
  const sm = s.getMinutes();
  const eh = e.getHours();
  const em = e.getMinutes();
  const fmt = (h: number, m: number) => {
    const am = h < 12;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${am ? '오전' : '오후'} ${h12}:${pad(m)}`;
  };
  return `${fmt(sh, sm)} – ${fmt(eh, em)}`;
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
