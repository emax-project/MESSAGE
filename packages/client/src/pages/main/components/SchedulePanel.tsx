import { memo } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { Event } from '../../../api';
import { addMonths, daysInMonth, startOfMonth, toLocalDateKey } from '../utils/date';

type EventFormState = {
  title: string;
  startAt: string;
  endAt: string;
  description: string;
};

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
  onCreateEvent: () => void | Promise<void>;
  onCancelEdit: () => void;
  onEditEvent: (ev: Event) => void;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
};

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

  return (
    <div style={panelWrapStyle(900)}>
      <div style={st.panelHeader}><h3 style={st.panelTitle}>일정</h3></div>
      <div style={{ ...st.panelBody, padding: isNarrowLayout ? 14 : 24 }}>
        <div style={{ border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`, borderRadius: 14, padding: isNarrowLayout ? 10 : 14, background: isDark ? '#1e293b' : '#fff', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" style={{ width: 30, height: 30, border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700 }} onClick={() => setCalendarMonth((m) => addMonths(m, -1))} aria-label="이전 달">◀</button>
            <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827', letterSpacing: '-0.01em' }}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</div>
            <button type="button" style={{ width: 30, height: 30, border: 'none', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700 }} onClick={() => setCalendarMonth((m) => addMonths(m, 1))} aria-label="다음 달">▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, idx) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : (isDark ? '#94a3b8' : '#64748b'), padding: '4px 0 3px' }}>{d}</div>
            ))}
            {(() => {
              const start = startOfMonth(calendarMonth);
              const firstDow = start.getDay();
              const totalDays = daysInMonth(calendarMonth);
              const cells = [];
              for (let i = 0; i < firstDow; i++) cells.push(<div key={`e-${i}`} style={{ height: isNarrowLayout ? 42 : 48 }} />);
              for (let day = 1; day <= totalDays; day++) {
                const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const list = eventsByDate.get(key) || [];
                const isSelected = key === selectedDate;
                const isToday = key === toLocalDateKey(new Date().toISOString());
                cells.push(
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    style={{
                      minHeight: isNarrowLayout ? 42 : 48,
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? '#9a58a8' : (isDark ? '#334155' : '#e9eef5')}`,
                      background: isSelected ? (isDark ? '#7c3d89' : '#9a58a8') : (isDark ? '#0f172a' : '#f8fafc'),
                      color: isSelected ? '#fff' : (isDark ? '#e2e8f0' : '#333'),
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      cursor: 'pointer',
                      fontSize: 12,
                      ...(isToday && !isSelected ? { boxShadow: 'inset 0 0 0 1.5px rgba(154,88,168,0.75)' } : {}),
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{day}</span>
                    {list.length > 0 && <span style={{ minWidth: 14, height: 14, fontSize: 9, lineHeight: '14px', fontWeight: 700, background: isSelected ? 'rgba(255,255,255,0.24)' : (isDark ? '#171717' : '#0f172a'), color: '#fff', borderRadius: 999, padding: '0 4px' }}>{list.length}</span>}
                  </button>,
                );
              }
              return cells;
            })()}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', background: isDark ? 'rgba(148,163,184,0.12)' : '#f1f5f9', padding: '4px 10px', borderRadius: 999 }}>선택: {selectedDate}</span>
            <button type="button" style={{ border: `1px solid ${isDark ? '#475569' : '#dbe3ee'}`, background: isDark ? '#1e293b' : '#fff', color: isDark ? '#e2e8f0' : '#334155', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => { const key = toLocalDateKey(new Date().toISOString()); if (key) { setSelectedDate(key); setCalendarMonth(startOfMonth(new Date())); } }}>
              오늘로 이동
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 16, border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 14, padding: isNarrowLayout ? 12 : 16, background: isDark ? '#0f172a' : '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#cbd5e1' : '#475569', marginBottom: 10 }}>
            {editingEventId ? '일정 수정' : '새 일정 추가'}
          </div>
          <input type="text" placeholder="제목" value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} style={st.formInput} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <input type="datetime-local" value={eventForm.startAt} onChange={(e) => setEventForm((f) => ({ ...f, startAt: e.target.value }))} style={{ ...st.formInput, marginBottom: 0, flex: '1 1 180px', minWidth: 0 }} />
            <span style={{ color: isDark ? '#94a3b8' : '#888' }}>~</span>
            <input type="datetime-local" value={eventForm.endAt} onChange={(e) => setEventForm((f) => ({ ...f, endAt: e.target.value }))} style={{ ...st.formInput, marginBottom: 0, flex: '1 1 180px', minWidth: 0 }} />
          </div>
          <input type="text" placeholder="설명 (선택)" value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} style={st.formInput} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {editingEventId ? (
              <>
                <button type="button" style={st.formBtn} onClick={() => void onUpdateEvent()}>수정</button>
                <button type="button" style={st.formBtnCancel} onClick={onCancelEdit}>취소</button>
              </>
            ) : (
              <button type="button" style={st.formBtn} onClick={() => void onCreateEvent()}>추가</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f1f5f9' : '#111827' }}>선택한 날짜 일정</span>
          <span style={{ fontSize: 12, color: isDark ? '#64748b' : '#888' }}>{selectedEvents.length}건</span>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {selectedEvents.map((ev) => (
            <li key={ev.id} style={{ padding: isNarrowLayout ? '11px 10px' : '12px 14px', border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`, borderRadius: 12, background: isDark ? '#1e293b' : '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333', marginBottom: 4 }}>{ev.title}</strong>
                <span style={{ display: 'block', fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginBottom: 4, lineHeight: 1.45 }}>{new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}</span>
                {ev.description && <span style={{ display: 'block', fontSize: 13, color: isDark ? '#64748b' : '#666' }}>{ev.description}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                <button type="button" style={st.formBtn} onClick={() => onEditEvent(ev)}>수정</button>
                <button type="button" style={{ ...st.formBtnCancel, color: '#c62828' }} onClick={() => void onDeleteEvent(ev.id)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
        {selectedEvents.length === 0 && (
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, margin: 0, padding: '14px 12px', borderRadius: 10, background: isDark ? 'rgba(148,163,184,0.08)' : '#f8fafc' }}>
            선택한 날짜에 일정이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(SchedulePanel);
