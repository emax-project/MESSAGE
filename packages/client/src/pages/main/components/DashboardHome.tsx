import { memo, useMemo } from 'react';
import type { Event } from '../../../api';
import { getDashboardMessages } from '../../../i18n';
import { cn } from '../../../utils/cn';
import { formatEventTime } from '../utils/date';
import { dashboardStyles } from '../utils/dashboardStyles';
import { WeekBarChart } from './WeekBarChart';
import type { WeekEventItem } from './WeekBarChart';

type ActivePanel = 'none' | 'mention' | 'bookmark' | 'schedule' | 'settings';

type DashboardHomeProps = {
  isDark: boolean;
  userName?: string | null;
  topicCount: number;
  chatCount: number;
  totalUnread: number;
  unreadMentionCount: number;
  todayEvents: Event[];
  weekEvents: WeekEventItem[];
  setActivePanel: (panel: ActivePanel) => void;
  onEventClick?: (event: Event) => void;
};

function DashboardHome({
  isDark,
  userName,
  topicCount,
  chatCount,
  totalUnread,
  unreadMentionCount,
  todayEvents,
  weekEvents,
  setActivePanel,
  onEventClick,
}: DashboardHomeProps) {
  const sortedTodayEvents = useMemo(
    () => [...todayEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [todayEvents]
  );

  const s = dashboardStyles(isDark);
  const t = getDashboardMessages();

  return (
    <div className="flex-1 min-h-0 overflow-auto p-3">
      <div className="flex flex-col gap-3 w-full min-w-0">
        <div className={cn(s.card, 'py-4 shrink-0')}>
          <h1 className={cn(s.headingLg, 'm-0 mb-0.5')}>
            {t.welcome(userName || t.defaultUserName)}
          </h1>
          <p className={cn(s.body, 'm-0')}>
            {t.greetingSub}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          <div className={s.statCard}>
            <span className={s.statLabel}>{t.statAgenda}</span>
            <span className={s.statCardValue()}>{topicCount}</span>
          </div>
          <div className={s.statCard}>
            <span className={s.statLabel}>{t.statChat}</span>
            <span className={s.statCardValue()}>{chatCount}</span>
          </div>
          <div
            className={cn(
              s.statCard,
              'cursor-pointer hover:opacity-95 transition-shadow',
              !isDark && 'hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/35 focus-visible:ring-offset-2',
              isDark ? 'focus-visible:ring-offset-slate-900' : 'focus-visible:ring-offset-white'
            )}
            onClick={() => setActivePanel('mention')}
            role="button"
            tabIndex={0}
            aria-label={t.unreadStatAria(totalUnread, unreadMentionCount)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActivePanel('mention');
              }
            }}
          >
            <div className="flex items-start justify-between gap-1 min-w-0">
              <span className={cn(s.statLabel, 'truncate')}>{t.statUnread}</span>
              {unreadMentionCount > 0 && (
                <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMentionCount > 9 ? '9+' : unreadMentionCount}
                </span>
              )}
            </div>
            <span className={s.statCardValue(totalUnread > 0)}>{totalUnread}</span>
          </div>
        </div>

        <div className={cn(s.card, 'flex flex-col overflow-hidden min-w-0')}>
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <h2 className={cn(s.heading, 'm-0')}>{t.todayScheduleTitle}</h2>
            <button
              type="button"
              className={s.btnLink}
              onClick={() => setActivePanel('schedule')}
            >
              {t.viewAll}
            </button>
          </div>
          {sortedTodayEvents.length === 0 ? (
            <p className={cn(s.bodyMuted, 'm-0 py-2')}>
              {t.noEventsToday}
            </p>
          ) : (
            <>
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5 overflow-auto min-h-0">
                {sortedTodayEvents.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className={cn(s.eventItem, onEventClick && 'cursor-pointer hover:opacity-90 transition-opacity')}
                    role={onEventClick ? 'button' : undefined}
                    tabIndex={onEventClick ? 0 : undefined}
                    onClick={onEventClick ? () => onEventClick(ev) : undefined}
                    onKeyDown={
                      onEventClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onEventClick(ev);
                            }
                          }
                        : undefined
                    }
                    aria-label={onEventClick ? t.eventRowAria(ev.title, formatEventTime(ev.startAt, ev.endAt)) : undefined}
                  >
                    <span className="w-1 h-8 rounded-full shrink-0 bg-brand-dark" />
                    <div className="min-w-0 flex-1">
                      <div className={s.eventTitle}>
                        {ev.title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatEventTime(ev.startAt, ev.endAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {sortedTodayEvents.length > 5 && (
                <button
                  type="button"
                  className={cn(s.btnLink, 'mt-1.5 text-left shrink-0')}
                  onClick={() => setActivePanel('schedule')}
                >
                  {t.moreEvents(sortedTodayEvents.length - 5)}
                </button>
              )}
            </>
          )}
        </div>

        <div className={cn(s.card, 'min-w-0')}>
          <h2 className={cn(s.heading, 'm-0 mb-2')}>{t.chartWeek}</h2>
          <div
            role="img"
            aria-label={t.ariaWeekBar(weekEvents.map((d) => `${d.label} ${d.count}건`).join(', '))}
          >
            <WeekBarChart isDark={isDark} data={weekEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardHome);
