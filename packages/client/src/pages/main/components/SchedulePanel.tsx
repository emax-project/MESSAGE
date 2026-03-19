import { memo, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { Event } from '../../../api';
import type { ScheduleCreateOptions } from '../hooks/useMainContentActions';
import { addMonths, daysInMonth, startOfMonth, toLocalDateKey } from '../utils/date';

type EventFormState = {
  title: string;
  startAt: string;
  endAt: string;
  description: string;
};

type CreateTab = 'normal' | 'period' | 'repeat';

type SchedulePanelProps = {
  st: Record<string, CSSProperties>;
  isDark: boolean;
  isNarrowLayout: boolean;
  panelWrapStyle: (maxWidth: number) => CSSProperties;
  calendarMonth: Date;
  selectedDate: string;
  eventsByDate: Map<string, Event[]>;
  eventForm: EventFormState;
  editingEventId: string | null;
  setCalendarMonth: Dispatch<SetStateAction<Date>>;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  setEventForm: Dispatch<SetStateAction<EventFormState>>;
  onUpdateEvent: () => void | Promise<void>;
  onCreateEvent: (options?: ScheduleCreateOptions) => void | Promise<void>;
  onCancelEdit: () => void;
  onEditEvent: (ev: Event) => void;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const QUICK_TIME_PRESETS = ['09:00', '10:00', '13:00', '18:00'];

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const inputBase =
  'w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors';

const actionBtn = 'rounded-xl px-4 py-2 text-sm font-semibold transition-colors';

const dateKeyOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDateLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return `${year}년 ${month}월 ${day}일`;
};

const formatTimeLabel = (time: string) => {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr || '0');
  const isAm = h < 12;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${isAm ? '오전' : '오후'} ${hour12}:${String(m).padStart(2, '0')}`;
};

const parseTimeParts = (time: string) => {
  const [h = '09', m = '00'] = time.split(':');
  const hour = Math.min(23, Math.max(0, Number(h || '0')));
  const minute = Math.min(59, Math.max(0, Number(m || '0')));
  return { hour, minute };
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function SchedulePanel({
  st,
  isDark,
  isNarrowLayout,
  panelWrapStyle,
  calendarMonth,
  selectedDate,
  eventsByDate,
  eventForm,
  editingEventId,
  setCalendarMonth,
  setSelectedDate,
  setEventForm,
  onUpdateEvent,
  onCreateEvent,
  onCancelEdit,
  onEditEvent,
  onDeleteEvent,
}: SchedulePanelProps) {
  const selectedEvents = eventsByDate.get(selectedDate) || [];
  const [createTab, setCreateTab] = useState<CreateTab>('normal');
  const [periodRange, setPeriodRange] = useState<{ startDate: string; endDate: string }>({
    startDate: selectedDate,
    endDate: selectedDate,
  });
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [repeatUntil, setRepeatUntil] = useState(selectedDate);
  const [rangeBaseMonth, setRangeBaseMonth] = useState<Date>(() => startOfMonth(new Date(selectedDate)));
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [draftPeriodRange, setDraftPeriodRange] = useState<{ startDate: string; endDate: string }>({
    startDate: selectedDate,
    endDate: selectedDate,
  });
  const [draftRangeBaseMonth, setDraftRangeBaseMonth] = useState<Date>(() => startOfMonth(new Date(selectedDate)));
  const [draftRangeAnchorDate, setDraftRangeAnchorDate] = useState<string | null>(null);
  const [singleDateModal, setSingleDateModal] = useState<{
    isOpen: boolean;
    target: 'start' | 'end' | null;
    baseMonth: Date;
  }>({
    isOpen: false,
    target: null,
    baseMonth: startOfMonth(new Date(selectedDate)),
  });
  const [timeModal, setTimeModal] = useState<{
    isOpen: boolean;
    target: 'start' | 'end' | null;
    context: 'event' | 'period';
    draftHour: number;
    draftMinute: number;
  }>({
    isOpen: false,
    target: null,
    context: 'event',
    draftHour: 9,
    draftMinute: 0,
  });

  useEffect(() => {
    if (editingEventId) return;
    setPeriodRange((prev) => ({
      startDate: prev.startDate || selectedDate,
      endDate: prev.endDate || selectedDate,
    }));
    setRepeatUntil((prev) => prev || selectedDate);
  }, [selectedDate, editingEventId]);

  const dayCellHeight = isNarrowLayout ? 'h-16' : 'h-[72px]';
  const startTime = eventForm.startAt.slice(11, 16) || '09:00';
  const endTime = eventForm.endAt.slice(11, 16) || '18:00';
  const startDatePart = eventForm.startAt.slice(0, 10) || selectedDate;
  const endDatePart = eventForm.endAt.slice(0, 10) || selectedDate;

  useEffect(() => {
    if (editingEventId || createTab !== 'period') return;
    setEventForm((f) => ({
      ...f,
      startAt: `${periodRange.startDate}T${f.startAt.slice(11, 16) || '09:00'}`,
      endAt: `${periodRange.endDate}T${f.endAt.slice(11, 16) || '18:00'}`,
    }));
  }, [createTab, editingEventId, periodRange.startDate, periodRange.endDate, setEventForm]);

  const selectDraftRangeDate = (dateKey: string) => {
    if (!draftRangeAnchorDate) {
      setDraftPeriodRange({ startDate: dateKey, endDate: dateKey });
      setDraftRangeAnchorDate(dateKey);
      return;
    }
    const [startDate, endDate] = dateKey >= draftRangeAnchorDate
      ? [draftRangeAnchorDate, dateKey]
      : [dateKey, draftRangeAnchorDate];
    setDraftPeriodRange({ startDate, endDate });
    setDraftRangeAnchorDate(null);
  };

  const openRangeModal = () => {
    setDraftPeriodRange(periodRange);
    setDraftRangeBaseMonth(rangeBaseMonth);
    setDraftRangeAnchorDate(null);
    setIsRangeModalOpen(true);
  };

  const applyRangeModal = () => {
    setPeriodRange(draftPeriodRange);
    setRangeBaseMonth(draftRangeBaseMonth);
    setIsRangeModalOpen(false);
  };

  const setEventDateTime = (target: 'start' | 'end', nextDate: string, nextTime: string) => {
    setEventForm((prev) => {
      const currentStartDate = prev.startAt.slice(0, 10) || selectedDate;
      const currentEndDate = prev.endAt.slice(0, 10) || selectedDate;
      const currentStartTime = prev.startAt.slice(11, 16) || '09:00';
      const currentEndTime = prev.endAt.slice(11, 16) || '18:00';
      const startAt = target === 'start'
        ? `${nextDate}T${nextTime}`
        : `${currentStartDate}T${currentStartTime}`;
      const endAt = target === 'end'
        ? `${nextDate}T${nextTime}`
        : `${currentEndDate}T${currentEndTime}`;
      return { ...prev, startAt, endAt };
    });
  };

  const openSingleDateModal = (target: 'start' | 'end') => {
    const currentDate = target === 'start' ? startDatePart : endDatePart;
    setSingleDateModal({
      isOpen: true,
      target,
      baseMonth: startOfMonth(new Date(currentDate || selectedDate)),
    });
  };

  const applySingleDate = (dateKey: string) => {
    if (!singleDateModal.target) return;
    const targetTime = singleDateModal.target === 'start' ? startTime : endTime;
    setEventDateTime(singleDateModal.target, dateKey, targetTime);
    setSingleDateModal((prev) => ({ ...prev, isOpen: false, target: null }));
  };

  const applyTimeValue = (target: 'start' | 'end', context: 'event' | 'period', time: string) => {
    if (!time) return;
    if (context === 'period') {
      setEventForm((f) => ({
        ...f,
        startAt: target === 'start' ? `${periodRange.startDate}T${time}` : f.startAt,
        endAt: target === 'end' ? `${periodRange.endDate}T${time}` : f.endAt,
      }));
    } else {
      const datePart = target === 'start' ? startDatePart : endDatePart;
      setEventDateTime(target, datePart, time);
    }
  };

  const getCurrentTimeValue = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const openTimeModal = (target: 'start' | 'end', context: 'event' | 'period' = 'event') => {
    const source = target === 'start' ? startTime : endTime;
    const { hour, minute } = parseTimeParts(source);
    setTimeModal({
      isOpen: true,
      target,
      context,
      draftHour: hour,
      draftMinute: minute,
    });
  };

  const closeTimeModal = () => {
    setTimeModal((prev) => ({ ...prev, isOpen: false, target: null, context: 'event' }));
  };

  const applyTimeModal = () => {
    if (!timeModal.target) return;
    const time = `${String(timeModal.draftHour).padStart(2, '0')}:${String(timeModal.draftMinute).padStart(2, '0')}`;
    applyTimeValue(timeModal.target, timeModal.context, time);
    closeTimeModal();
  };

  const renderSingleDateMonth = (month: Date, monthOffset: number) => {
    const monthStart = startOfMonth(month);
    const firstDow = monthStart.getDay();
    const totalDays = daysInMonth(month);
    const currentTarget = singleDateModal.target;
    const activeDate = currentTarget === 'end' ? endDatePart : startDatePart;
    const items: Array<{ key: string; dateKey?: string; day?: number }> = [];
    for (let i = 0; i < firstDow; i += 1) items.push({ key: `sm-empty-${monthOffset}-${i}` });
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      items.push({ key: `sm-${monthOffset}-${day}`, dateKey: dateKeyOf(date), day });
    }
    return (
      <div className={cn('rounded-xl border p-2', isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white')}>
        <div className={cn('mb-2 text-center text-sm font-semibold', isDark ? 'text-slate-100' : 'text-slate-700')}>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={`${monthOffset}-${label}`} className={cn('text-center text-[10px] font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {label}
            </div>
          ))}
          {items.map((item) => {
            if (!item.dateKey || !item.day) return <div key={item.key} className="h-8" />;
            const isActive = item.dateKey === activeDate;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => applySingleDate(item.dateKey!)}
                className={cn(
                  'h-8 rounded-md text-xs font-semibold transition-colors outline-none focus:outline-none',
                  isActive
                    ? 'bg-violet-500 text-white'
                    : isDark
                      ? 'text-slate-300 hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {item.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRangeMonth = (
    month: Date,
    monthOffset: number,
    range: { startDate: string; endDate: string },
    onSelectDate: (dateKey: string) => void,
  ) => {
    const monthStart = startOfMonth(month);
    const firstDow = monthStart.getDay();
    const totalDays = daysInMonth(month);
    const items: Array<{ key: string; dateKey?: string; day?: number }> = [];
    for (let i = 0; i < firstDow; i += 1) items.push({ key: `rm-empty-${monthOffset}-${i}` });
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      items.push({ key: `rm-${monthOffset}-${day}`, dateKey: dateKeyOf(date), day });
    }
    return (
      <div className={cn('rounded-xl border p-2', isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white')}>
        <div className={cn('mb-2 text-center text-sm font-semibold', isDark ? 'text-slate-100' : 'text-slate-700')}>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div key={`${monthOffset}-${label}`} className={cn('text-center text-[10px] font-medium', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {label}
            </div>
          ))}
          {items.map((item) => {
            if (!item.dateKey || !item.day) return <div key={item.key} className="h-8" />;
            const isStart = item.dateKey === range.startDate;
            const isEnd = item.dateKey === range.endDate;
            const isInRange = item.dateKey >= range.startDate && item.dateKey <= range.endDate;
            const isBoundary = isStart || isEnd;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectDate(item.dateKey!)}
                className={cn(
                  'h-8 rounded-md text-xs font-semibold transition-colors outline-none focus:outline-none',
                  isBoundary
                    ? (isDark ? 'bg-violet-500 text-white' : 'bg-violet-500 text-white')
                    : isInRange
                      ? (isDark ? 'bg-violet-500/20 text-violet-100' : 'bg-violet-100 text-violet-700')
                      : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100')
                )}
              >
                {item.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const calendarCells = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const firstDow = start.getDay();
    const totalDays = daysInMonth(calendarMonth);
    const cells: Array<{
      key: string;
      day?: number;
      dateKey?: string;
      isSelected?: boolean;
      isToday?: boolean;
      events?: Event[];
    }> = [];

    for (let i = 0; i < firstDow; i += 1) {
      cells.push({ key: `empty-${i}` });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const dateKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = eventsByDate.get(dateKey) || [];
      cells.push({
        key: dateKey,
        day,
        dateKey,
        isSelected: dateKey === selectedDate,
        isToday: dateKey === toLocalDateKey(new Date().toISOString()),
        events,
      });
    }
    return cells;
  }, [calendarMonth, eventsByDate, selectedDate]);

  const calendarEventLayout = useMemo(() => {
    const maxVisibleLanes = 2;
    const layout = new Map<string, { rows: Array<Event | null>; hiddenCount: number }>();
    const monthStart = startOfMonth(calendarMonth);
    const totalDays = daysInMonth(calendarMonth);
    const monthDateKeys: string[] = [];
    for (let day = 1; day <= totalDays; day += 1) {
      monthDateKeys.push(dateKeyOf(new Date(monthStart.getFullYear(), monthStart.getMonth(), day)));
    }
    if (monthDateKeys.length === 0) return layout;

    const monthFirstKey = monthDateKeys[0];
    const monthLastKey = monthDateKeys[monthDateKeys.length - 1];
    const eventRangeById = new Map<string, { event: Event; startKey: string; endKey: string; startMs: number; isMultiDay: boolean }>();

    monthDateKeys.forEach((dateKey) => {
      const events = eventsByDate.get(dateKey) || [];
      events.forEach((ev) => {
        if (eventRangeById.has(ev.id)) return;
        const startKeyRaw = toLocalDateKey(ev.startAt);
        const endKeyRaw = toLocalDateKey(ev.endAt);
        if (!startKeyRaw || !endKeyRaw) return;
        const [startKey, endKey] = startKeyRaw <= endKeyRaw
          ? [startKeyRaw, endKeyRaw]
          : [endKeyRaw, startKeyRaw];
        const clampedStart = startKey < monthFirstKey ? monthFirstKey : startKey;
        const clampedEnd = endKey > monthLastKey ? monthLastKey : endKey;
        if (clampedStart > clampedEnd) return;
        const startMs = Number.isFinite(new Date(ev.startAt).getTime()) ? new Date(ev.startAt).getTime() : 0;
        eventRangeById.set(ev.id, {
          event: ev,
          startKey: clampedStart,
          endKey: clampedEnd,
          startMs,
          isMultiDay: clampedStart < clampedEnd,
        });
      });
    });

    const sortedRanges = [...eventRangeById.values()].sort((a, b) => {
      if (a.isMultiDay !== b.isMultiDay) return a.isMultiDay ? -1 : 1;
      if (a.startKey !== b.startKey) return a.startKey.localeCompare(b.startKey);
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      return String(a.event.id).localeCompare(String(b.event.id));
    });

    const laneEndByIndex: string[] = [];
    const eventLaneById = new Map<string, number>();

    sortedRanges.forEach((item) => {
      let lane = 0;
      while (laneEndByIndex[lane] && item.startKey <= laneEndByIndex[lane]) lane += 1;
      laneEndByIndex[lane] = item.endKey;
      eventLaneById.set(item.event.id, lane);
    });

    monthDateKeys.forEach((dateKey) => {
      const dayEvents = (eventsByDate.get(dateKey) || [])
        .filter((ev) => eventLaneById.has(ev.id))
        .sort((a, b) => {
          const laneA = eventLaneById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const laneB = eventLaneById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          if (laneA !== laneB) return laneA - laneB;
          const aStart = Number.isFinite(new Date(a.startAt).getTime()) ? new Date(a.startAt).getTime() : 0;
          const bStart = Number.isFinite(new Date(b.startAt).getTime()) ? new Date(b.startAt).getTime() : 0;
          if (aStart !== bStart) return aStart - bStart;
          return String(a.id).localeCompare(String(b.id));
        });

      const rows: Array<Event | null> = Array.from({ length: maxVisibleLanes }, () => null);
      let visibleCount = 0;
      dayEvents.forEach((ev) => {
        const lane = eventLaneById.get(ev.id);
        if (lane === undefined || lane >= maxVisibleLanes) return;
        if (!rows[lane]) {
          rows[lane] = ev;
          visibleCount += 1;
        }
      });
      layout.set(dateKey, {
        rows,
        hiddenCount: Math.max(0, dayEvents.length - visibleCount),
      });
    });

    return layout;
  }, [calendarMonth, eventsByDate]);

  return (
    <section style={panelWrapStyle(900)}>
      <header style={st.panelHeader}>
        <h3 style={st.panelTitle}>일정</h3>
      </header>

      <div
        style={{ ...st.panelBody, padding: isNarrowLayout ? 14 : 24 }}
        className={cn(isDark ? 'bg-slate-900' : 'bg-slate-50')}
      >
        <article
          className={cn(
            'mb-4 rounded-2xl border p-4',
            isDark
              ? 'border-violet-400/30 bg-slate-800/80'
              : 'border-violet-100 bg-white shadow-sm'
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4
              className={cn(
                'text-base font-semibold tracking-tight',
                isDark ? 'text-slate-100' : 'text-slate-700'
              )}
            >
              {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
                className={cn(
                  'h-8 w-8 rounded-lg border text-sm font-bold',
                  isDark
                    ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                className={cn(
                  'h-8 w-8 rounded-lg border text-sm font-bold',
                  isDark
                    ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1.5 gap-x-0">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className={cn(
                  'pb-1 text-center text-[11px] font-semibold',
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              >
                {label}
              </div>
            ))}

            {calendarCells.map((cell) => {
              if (!cell.day || !cell.dateKey) {
                return <div key={cell.key} className={cn(dayCellHeight)} />;
              }
              const dayLayout = calendarEventLayout.get(cell.dateKey) || { rows: [null, null], hiddenCount: 0 };
              const visible = dayLayout.rows;
              const hiddenCount = dayLayout.hiddenCount;
              const [year, month, day] = (cell.dateKey || '').split('-').map(Number);
              const cellWeekday = new Date(year, (month || 1) - 1, day || 1).getDay();
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateKey!)}
                  className={cn(
                    dayCellHeight,
                    'relative overflow-visible rounded-xl p-1.5 text-left transition-colors',
                    cell.isSelected
                      ? isDark
                        ? 'bg-violet-500/20'
                        : 'bg-violet-50'
                      : isDark
                        ? 'bg-slate-900 hover:bg-slate-800'
                        : 'bg-white hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'mx-auto mb-1 flex h-5 w-5 items-center justify-center text-xs font-semibold',
                      cell.isSelected
                        ? isDark
                          ? 'text-violet-100'
                          : 'text-violet-700'
                        : cell.isToday
                          ? isDark
                            ? 'text-sky-200'
                            : 'text-sky-600'
                          : isDark
                            ? 'text-slate-200'
                            : 'text-slate-600'
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="min-h-[28px] space-y-0.5">
                    {visible.map((event, index) => {
                      if (!event) {
                        return <div key={`empty-row-${cell.dateKey}-${index}`} className="h-[14px]" />;
                      }
                      const startKey = toLocalDateKey(event.startAt);
                      const endKey = toLocalDateKey(event.endAt);
                      const hasRange = Boolean(startKey && endKey);
                      const rangeStart = hasRange ? (startKey! <= endKey! ? startKey! : endKey!) : null;
                      const rangeEnd = hasRange ? (startKey! <= endKey! ? endKey! : startKey!) : null;
                      const isMultiDay = Boolean(rangeStart && rangeEnd && rangeStart < rangeEnd);
                      const isRangeStart = isMultiDay && rangeStart === cell.dateKey;
                      const isRangeEnd = isMultiDay && rangeEnd === cell.dateKey;
                      const startsSegmentThisWeek = isMultiDay && (isRangeStart || cellWeekday === 0);
                      const endsSegmentThisWeek = isMultiDay && (isRangeEnd || cellWeekday === 6);
                      const showTitle = !isMultiDay || isRangeStart;

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'truncate px-1.5 py-[1px] text-[10px] font-medium',
                            isMultiDay
                              ? startsSegmentThisWeek && endsSegmentThisWeek
                                ? 'rounded-md'
                                : startsSegmentThisWeek
                                  ? '-mr-1.5 rounded-l-md rounded-r-none'
                                  : endsSegmentThisWeek
                                    ? '-ml-1.5 rounded-l-none rounded-r-md'
                                    : '-mx-1.5 rounded-none'
                              : 'rounded-md',
                            isDark
                              ? 'bg-violet-300/20 text-violet-100'
                              : 'bg-violet-100 text-violet-700'
                          )}
                          title={event.title}
                        >
                          {showTitle ? event.title : '\u00A0'}
                        </div>
                      );
                    })}
                  </div>
                  {hiddenCount > 0 && (
                    <div
                      className={cn(
                        'pointer-events-none absolute right-1.5 top-1.5 rounded px-1 text-[10px] font-semibold',
                        isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-600'
                      )}
                    >
                      +{hiddenCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                isDark
                  ? 'bg-violet-500/20 text-violet-200'
                  : 'bg-violet-100 text-violet-700'
              )}
            >
              선택: {selectedDate}
            </span>
            <button
              type="button"
              onClick={() => {
                const key = toLocalDateKey(new Date().toISOString());
                if (key) {
                  setSelectedDate(key);
                  setCalendarMonth(startOfMonth(new Date()));
                }
              }}
              className={cn(
                actionBtn,
                'border',
                isDark
                  ? 'border-violet-300/50 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20'
                  : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
              )}
            >
              오늘로 이동
            </button>
          </div>
        </article>

        <article
          className={cn(
            'mb-4 rounded-2xl border p-4',
            isDark ? 'border-violet-300/30 bg-slate-800/70' : 'border-violet-100 bg-violet-50/40'
          )}
        >
          {!editingEventId && (
            <div className="mb-3 flex flex-wrap gap-2">
              {([
                { id: 'normal', label: '일반' },
                { id: 'period', label: '기간' },
                { id: 'repeat', label: '반복' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCreateTab(tab.id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold',
                    createTab === tab.id
                      ? isDark
                        ? 'border-violet-300/70 bg-violet-500/20 text-violet-100'
                        : 'border-violet-300 bg-violet-100 text-violet-700'
                      : isDark
                        ? 'border-violet-300/25 bg-transparent text-violet-300 hover:bg-violet-500/10'
                        : 'border-violet-200 bg-white text-violet-600 hover:bg-violet-50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <h5
            className={cn(
              'mb-3 text-sm font-semibold',
              isDark ? 'text-violet-200' : 'text-violet-700'
            )}
          >
            {editingEventId ? '일정 수정' : '새 일정 추가'}
          </h5>

          <input
            type="text"
            placeholder="제목"
            value={eventForm.title}
            onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))}
            className={cn(
              inputBase,
              'mb-2',
              isDark
                ? 'border-violet-300/30 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                : 'border-violet-200 bg-white text-slate-700 placeholder:text-slate-400'
            )}
          />

          {editingEventId && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={eventForm.startAt}
                onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))}
                className={cn(
                  inputBase,
                  'mb-0 flex-1 basis-44',
                  isDark
                    ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                    : 'border-violet-200 bg-white text-slate-700'
                )}
              />
              <span className={cn('text-sm font-medium', isDark ? 'text-violet-300' : 'text-violet-500')}>~</span>
              <input
                type="datetime-local"
                value={eventForm.endAt}
                onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))}
                className={cn(
                  inputBase,
                  'mb-0 flex-1 basis-44',
                  isDark
                    ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                    : 'border-violet-200 bg-white text-slate-700'
                )}
              />
            </div>
          )}

          {!editingEventId && createTab === 'normal' && (
            <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className={cn('rounded-xl border p-3', isDark ? 'border-violet-300/30 bg-slate-900/70' : 'border-violet-100 bg-white')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>시작</div>
                <button
                  type="button"
                  onClick={() => openSingleDateModal('start')}
                  className={cn(
                    'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none focus:outline-none',
                    isDark ? 'border-violet-300/30 bg-slate-800 text-slate-100' : 'border-violet-200 bg-violet-50 text-slate-700'
                  )}
                >
                  <span>{formatDateLabel(startDatePart)}</span>
                  <CalendarIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
                <button
                  type="button"
                  onClick={() => openTimeModal('start', 'event')}
                  className={cn(
                    inputBase,
                    'mb-0 flex cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(startTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
              </div>

              <div className={cn('rounded-xl border p-3', isDark ? 'border-violet-300/30 bg-slate-900/70' : 'border-violet-100 bg-white')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>종료</div>
                <button
                  type="button"
                  onClick={() => openSingleDateModal('end')}
                  className={cn(
                    'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none focus:outline-none',
                    isDark ? 'border-violet-300/30 bg-slate-800 text-slate-100' : 'border-violet-200 bg-violet-50 text-slate-700'
                  )}
                >
                  <span>{formatDateLabel(endDatePart)}</span>
                  <CalendarIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
                <button
                  type="button"
                  onClick={() => openTimeModal('end', 'event')}
                  className={cn(
                    inputBase,
                    'mb-0 flex cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(endTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
              </div>
            </div>
          )}

          {!editingEventId && createTab === 'repeat' && (
            <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <div className={cn('rounded-xl border p-3', isDark ? 'border-violet-300/30 bg-slate-900/70' : 'border-violet-100 bg-white')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>반복 시작</div>
                <button
                  type="button"
                  onClick={() => openSingleDateModal('start')}
                  className={cn(
                    'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none focus:outline-none',
                    isDark ? 'border-violet-300/30 bg-slate-800 text-slate-100' : 'border-violet-200 bg-violet-50 text-slate-700'
                  )}
                >
                  <span>{formatDateLabel(startDatePart)}</span>
                  <CalendarIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
                <button
                  type="button"
                  onClick={() => openTimeModal('start', 'event')}
                  className={cn(
                    inputBase,
                    'mb-0 flex cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(startTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
              </div>

              <div className={cn('rounded-xl border p-3', isDark ? 'border-violet-300/30 bg-slate-900/70' : 'border-violet-100 bg-white')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>반복 종료</div>
                <button
                  type="button"
                  onClick={() => openSingleDateModal('end')}
                  className={cn(
                    'mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none focus:outline-none',
                    isDark ? 'border-violet-300/30 bg-slate-800 text-slate-100' : 'border-violet-200 bg-violet-50 text-slate-700'
                  )}
                >
                  <span>{formatDateLabel(endDatePart)}</span>
                  <CalendarIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
                <button
                  type="button"
                  onClick={() => openTimeModal('end', 'event')}
                  className={cn(
                    inputBase,
                    'mb-0 flex cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(endTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
              </div>
            </div>
          )}

          {!editingEventId && createTab === 'period' && (
            <>
              <div className="mb-2 rounded-xl border border-violet-200/70 bg-white/70 p-2 dark:border-violet-300/20 dark:bg-slate-900/50">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className={cn('text-xs font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>
                    선택 기간: {periodRange.startDate} ~ {periodRange.endDate}
                  </div>
                  <button
                    type="button"
                    onClick={openRangeModal}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold outline-none focus:outline-none',
                      isDark
                        ? 'border-violet-300/35 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20'
                        : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                    )}
                    aria-label="기간 캘린더 열기"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    기간 선택
                  </button>
                </div>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openTimeModal('start', 'period')}
                  className={cn(
                    inputBase,
                    'mb-0 flex flex-1 basis-28 cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(startTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
                <span className={cn('text-sm font-medium', isDark ? 'text-violet-300' : 'text-violet-500')}>~</span>
                <button
                  type="button"
                  onClick={() => openTimeModal('end', 'period')}
                  className={cn(
                    inputBase,
                    'mb-0 flex flex-1 basis-28 cursor-pointer items-center justify-between text-left',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <span>{formatTimeLabel(endTime)}</span>
                  <ClockIcon className={cn(isDark ? 'text-violet-300' : 'text-violet-600')} />
                </button>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_TIME_PRESETS.map((time) => (
                  <button
                    key={`period-preset-${time}`}
                    type="button"
                    onClick={() => {
                      applyTimeValue('start', 'period', time);
                      applyTimeValue('end', 'period', time);
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                      isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </>
          )}

          {!editingEventId && createTab === 'repeat' && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="relative w-32">
                <select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className={cn(
                    inputBase,
                    'mb-0 w-full appearance-none pr-8',
                    isDark
                      ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                      : 'border-violet-200 bg-white text-slate-700'
                  )}
                >
                  <option value="daily">매일</option>
                  <option value="weekly">매주</option>
                  <option value="monthly">매월</option>
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2',
                    isDark ? 'text-slate-300' : 'text-slate-500'
                  )}
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <span
                className={cn(
                  'text-xs font-semibold',
                  isDark ? 'text-violet-300' : 'text-violet-600'
                )}
              >
                종료일
              </span>
              <input
                type="date"
                value={repeatUntil}
                onChange={(e) => setRepeatUntil(e.target.value)}
                className={cn(
                  inputBase,
                  'mb-0 min-w-[180px] flex-1 focus:ring-0',
                  isDark
                    ? 'border-violet-300/30 bg-slate-900 text-slate-100'
                    : 'border-violet-200 bg-white text-slate-700'
                )}
              />
            </div>
          )}

          <input
            type="text"
            placeholder="설명 (선택)"
            value={eventForm.description}
            onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
            className={cn(
              inputBase,
              isDark
                ? 'border-violet-300/30 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                : 'border-violet-200 bg-white text-slate-700 placeholder:text-slate-400'
            )}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {editingEventId ? (
              <>
                <button
                  type="button"
                  onClick={() => void onUpdateEvent()}
                  className={cn(
                    actionBtn,
                    isDark
                      ? 'bg-violet-500 text-white hover:bg-violet-400'
                      : 'bg-violet-500 text-white hover:bg-violet-400'
                  )}
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className={cn(
                    actionBtn,
                    'border',
                    isDark
                      ? 'border-violet-300/40 bg-transparent text-violet-200 hover:bg-violet-500/10'
                      : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                  )}
                >
                  취소
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (createTab === 'period') {
                    void onCreateEvent({
                      mode: 'period',
                      periodStartDate: periodRange.startDate,
                      periodEndDate: periodRange.endDate,
                    });
                    return;
                  }
                  if (createTab === 'repeat') {
                    void onCreateEvent({
                      mode: 'repeat',
                      repeatType,
                      repeatUntil,
                    });
                    return;
                  }
                  void onCreateEvent();
                }}
                className={cn(
                  actionBtn,
                  isDark
                    ? 'bg-violet-500 text-white hover:bg-violet-400'
                    : 'bg-violet-500 text-white hover:bg-violet-400'
                )}
              >
                추가
              </button>
            )}
          </div>
        </article>

        <div className="mb-2 flex items-center justify-between px-1">
          <h5
            className={cn(
              'text-sm font-semibold',
              isDark ? 'text-violet-200' : 'text-violet-700'
            )}
          >
            선택한 날짜 일정
          </h5>
          <span
            className={cn(
              'text-xs font-medium',
              isDark ? 'text-violet-300' : 'text-violet-600'
            )}
          >
            {selectedEvents.length}건
          </span>
        </div>

        {selectedEvents.length === 0 ? (
          <p
            className={cn(
              'rounded-xl px-4 py-3 text-sm',
              isDark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'
            )}
          >
            선택한 날짜에 일정이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((ev) => (
              <li
                key={ev.id}
                className={cn(
                  'flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3',
                  isDark
                    ? 'border-violet-300/30 bg-slate-800/80'
                    : 'border-violet-100 bg-white shadow-sm'
                )}
              >
                <div className="min-w-0 flex-1">
                  <strong
                    className={cn(
                      'mb-1 block truncate text-sm font-semibold',
                      isDark ? 'text-violet-100' : 'text-violet-700'
                    )}
                  >
                    {ev.title}
                  </strong>
                  <span
                    className={cn(
                      'mb-1 block text-xs leading-relaxed',
                      isDark ? 'text-violet-300' : 'text-violet-600'
                    )}
                  >
                    {new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}
                  </span>
                  {ev.description && (
                    <span
                      className={cn(
                        'block text-sm',
                        isDark ? 'text-slate-300' : 'text-slate-500'
                      )}
                    >
                      {ev.description}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEditEvent(ev)}
                    className={cn(
                      actionBtn,
                      'px-3 py-1.5 text-xs',
                      isDark
                        ? 'bg-violet-500 text-white hover:bg-violet-400'
                        : 'bg-violet-500 text-white hover:bg-violet-400'
                    )}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteEvent(ev.id)}
                    className={cn(
                      actionBtn,
                      'border px-3 py-1.5 text-xs',
                      isDark
                        ? 'border-rose-300/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                        : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                    )}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {singleDateModal.isOpen && !editingEventId && (createTab === 'normal' || createTab === 'repeat') && (
        <div
          className="fixed inset-0 z-[1995] flex items-center justify-center bg-black/35 p-4"
          onClick={() => setSingleDateModal((prev) => ({ ...prev, isOpen: false, target: null }))}
        >
          <div
            className={cn(
              'w-full max-w-[760px] rounded-2xl border p-4',
              isDark ? 'border-violet-300/30 bg-slate-900' : 'border-violet-100 bg-white shadow-soft'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className={cn('text-sm font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>
                {singleDateModal.target === 'end' ? '종료일 선택' : '시작일 선택'}
              </div>
              <button
                type="button"
                onClick={() => setSingleDateModal((prev) => ({ ...prev, isOpen: false, target: null }))}
                className={cn('h-8 w-8 rounded-md border text-sm', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                aria-label="날짜 선택 모달 닫기"
              >
                ×
              </button>
            </div>

            <div className="mb-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className={cn('h-8 w-8 rounded-md border text-sm font-bold', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                onClick={() => setSingleDateModal((prev) => ({ ...prev, baseMonth: addMonths(prev.baseMonth, -1) }))}
                aria-label="날짜 이전 달"
              >
                ‹
              </button>
              <button
                type="button"
                className={cn('h-8 w-8 rounded-md border text-sm font-bold', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                onClick={() => setSingleDateModal((prev) => ({ ...prev, baseMonth: addMonths(prev.baseMonth, 1) }))}
                aria-label="날짜 다음 달"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {renderSingleDateMonth(singleDateModal.baseMonth, 0)}
              {renderSingleDateMonth(addMonths(singleDateModal.baseMonth, 1), 1)}
            </div>
          </div>
        </div>
      )}

      {timeModal.isOpen && !editingEventId && (
        <div
          className="fixed inset-0 z-[1998] flex items-center justify-center bg-black/35 p-4"
          onClick={closeTimeModal}
        >
          <div
            className={cn(
              'w-full max-w-[540px] rounded-2xl border p-4',
              isDark ? 'border-violet-300/30 bg-slate-900' : 'border-violet-100 bg-white shadow-soft'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className={cn('text-sm font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>
                  시간 선택
                </div>
                <div className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  시/분을 직접 조정해 주세요
                </div>
              </div>
              <button
                type="button"
                onClick={closeTimeModal}
                className={cn(
                  'h-8 w-8 rounded-md border text-sm',
                  isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
                aria-label="시간 선택 모달 닫기"
              >
                ×
              </button>
            </div>

            <div className={cn('mb-3 rounded-xl p-3 text-center text-sm font-semibold', isDark ? 'bg-violet-500/15 text-violet-100' : 'bg-violet-50 text-violet-700')}>
              {formatTimeLabel(`${String(timeModal.draftHour).padStart(2, '0')}:${String(timeModal.draftMinute).padStart(2, '0')}`)}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={cn('rounded-xl border p-3', isDark ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-600')}>시</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeModal((prev) => ({ ...prev, draftHour: Math.max(0, prev.draftHour - 1) }))}
                    className={cn('h-9 w-9 rounded-lg border text-base font-bold', isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-white')}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={timeModal.draftHour}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTimeModal((prev) => ({ ...prev, draftHour: Number.isNaN(val) ? prev.draftHour : Math.min(23, Math.max(0, val)) }));
                    }}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                      isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-700'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setTimeModal((prev) => ({ ...prev, draftHour: Math.min(23, prev.draftHour + 1) }))}
                    className={cn('h-9 w-9 rounded-lg border text-base font-bold', isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-white')}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={cn('rounded-xl border p-3', isDark ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50')}>
                <div className={cn('mb-2 text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-600')}>분</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeModal((prev) => ({ ...prev, draftMinute: Math.max(0, prev.draftMinute - 1) }))}
                    className={cn('h-9 w-9 rounded-lg border text-base font-bold', isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-white')}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={timeModal.draftMinute}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTimeModal((prev) => ({ ...prev, draftMinute: Number.isNaN(val) ? prev.draftMinute : Math.min(59, Math.max(0, val)) }));
                    }}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                      isDark ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-700'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setTimeModal((prev) => ({ ...prev, draftMinute: Math.min(59, prev.draftMinute + 1) }))}
                    className={cn('h-9 w-9 rounded-lg border text-base font-bold', isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-white')}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_TIME_PRESETS.map((time) => (
                <button
                  key={`time-modal-${time}`}
                  type="button"
                  onClick={() => {
                    const { hour, minute } = parseTimeParts(time);
                    setTimeModal((prev) => ({ ...prev, draftHour: hour, draftMinute: minute }));
                  }}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {time}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const { hour, minute } = parseTimeParts(getCurrentTimeValue());
                  setTimeModal((prev) => ({ ...prev, draftHour: hour, draftMinute: minute }));
                }}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  isDark ? 'bg-violet-500/15 text-violet-200 hover:bg-violet-500/25' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                )}
              >
                지금
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTimeModal}
                className={cn(
                  actionBtn,
                  'border',
                  isDark
                    ? 'border-violet-300/40 bg-transparent text-violet-200 hover:bg-violet-500/10'
                    : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                )}
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyTimeModal}
                className={cn(
                  actionBtn,
                  isDark
                    ? 'bg-violet-500 text-white hover:bg-violet-400'
                    : 'bg-violet-500 text-white hover:bg-violet-400'
                )}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {isRangeModalOpen && !editingEventId && createTab === 'period' && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsRangeModalOpen(false)}
        >
          <div
            className={cn(
              'w-full max-w-[760px] rounded-2xl border p-4',
              isDark ? 'border-violet-300/30 bg-slate-900' : 'border-violet-100 bg-white shadow-soft'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className={cn('text-sm font-semibold', isDark ? 'text-violet-200' : 'text-violet-700')}>
                  출발일/도착일을 선택해 주세요
                </div>
                <div className={cn('text-xs', isDark ? 'text-violet-300' : 'text-violet-600')}>
                  {draftRangeAnchorDate ? '종료일을 선택해 주세요' : '시작일을 먼저 선택해 주세요'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRangeModalOpen(false)}
                className={cn('h-8 w-8 rounded-md border text-sm', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                aria-label="기간 선택 모달 닫기"
              >
                ×
              </button>
            </div>

            <div className="mb-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className={cn('h-8 w-8 rounded-md border text-sm font-bold', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                onClick={() => setDraftRangeBaseMonth((m) => addMonths(m, -1))}
                aria-label="기간 이전 달"
              >
                ‹
              </button>
              <button
                type="button"
                className={cn('h-8 w-8 rounded-md border text-sm font-bold', isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}
                onClick={() => setDraftRangeBaseMonth((m) => addMonths(m, 1))}
                aria-label="기간 다음 달"
              >
                ›
              </button>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {renderRangeMonth(draftRangeBaseMonth, 0, draftPeriodRange, selectDraftRangeDate)}
              {renderRangeMonth(addMonths(draftRangeBaseMonth, 1), 1, draftPeriodRange, selectDraftRangeDate)}
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <span className={cn('text-xs font-medium', isDark ? 'text-violet-200' : 'text-violet-700')}>
                선택 기간: {draftPeriodRange.startDate} ~ {draftPeriodRange.endDate}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRangeModalOpen(false)}
                className={cn(
                  actionBtn,
                  'border',
                  isDark
                    ? 'border-violet-300/40 bg-transparent text-violet-200 hover:bg-violet-500/10'
                    : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50'
                )}
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyRangeModal}
                className={cn(
                  actionBtn,
                  isDark
                    ? 'bg-violet-500 text-white hover:bg-violet-400'
                    : 'bg-violet-500 text-white hover:bg-violet-400'
                )}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(SchedulePanel);
