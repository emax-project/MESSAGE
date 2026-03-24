import { memo, useMemo } from 'react';
import type { Event } from '../../../api';
import { getDashboardMessages } from '../../../i18n';
import { cn } from '../../../utils/cn';
import { formatEventTime } from '../utils/date';
import { dashboardStyles } from '../utils/dashboardStyles';
import { RoomDonutChart, UnreadDonutChart } from './DonutChart';
import { WeekBarChart } from './WeekBarChart';
import type { WeekEventItem } from './WeekBarChart';

type ActivePanel = 'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'settings';

type DashboardHomeProps = {
  isDark: boolean;
  userName?: string | null;
  topicCount: number;
  chatCount: number;
  topicUnreadCount: number;
  chatUnreadCount: number;
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
  topicUnreadCount,
  chatUnreadCount,
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
    <div className="flex-1 min-h-0 overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
        {/* Col 1: Welcome + Stats + Quick actions */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className={cn(s.card, 'py-4 shrink-0')}>
            <h1 className={cn(s.headingLg, 'm-0 mb-0.5')}>
              {t.welcome(userName || t.defaultUserName)}
            </h1>
            <p className={cn(s.body, 'm-0')}>
              {t.greetingSub}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className={s.stat}>
              <span className={s.statValue()}>{topicCount}</span>
              <span className={s.statLabel}>{t.statAgenda}</span>
            </div>
            <div className={s.stat}>
              <span className={s.statValue()}>{chatCount}</span>
              <span className={s.statLabel}>{t.statChat}</span>
            </div>
            <div
              className={cn(s.stat, 'cursor-pointer hover:opacity-90')}
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
              <span className={s.statValue(totalUnread > 0)}>
                {totalUnread}
              </span>
              <span className={s.statLabel}>{t.statUnread}</span>
              {unreadMentionCount > 0 && (
                <span className="ml-auto min-w-[16px] h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMentionCount > 9 ? '9+' : unreadMentionCount}
                </span>
              )}
            </div>
            <div className={s.stat}>
              <span className={s.statValue()}>
                {sortedTodayEvents.length}
              </span>
              <span className={s.statLabel}>{t.statTodayEvents}</span>
            </div>
          </div>

        </div>

        {/* Col 2: Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 min-h-0">
          <div className={cn(s.card, 'flex flex-col')}>
            <h2 className={cn(s.heading, 'm-0 mb-2 shrink-0')}>{t.chartRoomDistribution}</h2>
            <div className="flex items-center gap-3" role="img" aria-label={t.ariaRoomDistribution(topicCount, chatCount)}>
              <RoomDonutChart isDark={isDark} topicCount={topicCount} chatCount={chatCount} />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-dark shrink-0" />
                  <span className={s.subtitle}>{t.legendAgendaRooms(topicCount)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-light shrink-0" />
                  <span className={s.subtitle}>{t.legendChatRooms(chatCount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(s.card, 'flex flex-col')}>
            <h2 className={cn(s.heading, 'm-0 mb-2 shrink-0')}>{t.chartUnreadTitle}</h2>
            <div className="flex items-center gap-3" role="img" aria-label={t.ariaUnreadChart(topicUnreadCount, chatUnreadCount)}>
              <UnreadDonutChart isDark={isDark} topicUnread={topicUnreadCount} chatUnread={chatUnreadCount} />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-dark shrink-0" />
                  <span className={s.subtitle}>{t.legendAgendaUnread(topicUnreadCount)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-light shrink-0" />
                  <span className={s.subtitle}>{t.legendChatUnread(chatUnreadCount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(s.card, 'sm:col-span-2 xl:col-span-1')}>
            <h2 className={cn(s.heading, 'm-0 mb-2')}>{t.chartWeek}</h2>
            <div
              role="img"
              aria-label={t.ariaWeekBar(weekEvents.map((d) => `${d.label} ${d.count}건`).join(', '))}
            >
              <WeekBarChart isDark={isDark} data={weekEvents} />
            </div>
          </div>
        </div>

        {/* Col 3: Today's events + CTA */}
        <div className="flex flex-col gap-3 min-h-0 md:col-span-2 xl:col-span-1">
          <div className={cn(s.card, 'flex-1 min-h-0 flex flex-col overflow-hidden')}>
            <div className="flex items-center justify-between mb-2 shrink-0">
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
                <ul className="list-none m-0 p-0 flex flex-col gap-1.5 overflow-auto min-h-0 flex-1">
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

          <div className={s.ctaCard}>
            <p className={cn(s.body, 'm-0')}>
              {t.ctaStartChat}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardHome);
