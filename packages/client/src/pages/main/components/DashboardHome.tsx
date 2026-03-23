import { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Event } from '../../../api';
import { cn } from '../../../utils/cn';
import { formatEventTime } from '../utils/date';

type ActivePanel = 'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'settings';

type WeekEventItem = { dateKey: string; label: string; count: number };

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
};

const DONUT_COLORS = ['#5B8DEF', '#7CA5FF'];

/** Donut chart using Recharts */
function DonutChart({
  isDark,
  data,
  size = 80,
}: {
  isDark: boolean;
  data: { name: string; value: number }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const displayData = data.filter((d) => d.value > 0);
  const isEmpty = displayData.length === 0;

  if (isEmpty) {
    return (
      <div
        className="shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: size,
          height: size,
          background: isDark ? '#334155' : '#e2e8f0',
        }}
      >
        <span className="text-[10px] font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {total}
        </span>
      </div>
    );
  }

  return (
    <div className="shrink-0 relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            innerRadius={size * 0.4}
            outerRadius={size * 0.5}
            paddingAngle={0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {displayData.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span
        className="absolute inset-0 flex items-center justify-center select-none text-[10px] font-bold pointer-events-none"
        style={{ color: isDark ? '#94a3b8' : '#64748b' }}
      >
        {total}
      </span>
    </div>
  );
}

/** Alias for backward compatibility */
const RoomDonutChart = ({
  isDark,
  topicCount,
  chatCount,
}: {
  isDark: boolean;
  topicCount: number;
  chatCount: number;
}) => <DonutChart isDark={isDark} data={[{ name: '아젠다', value: topicCount }, { name: '채팅', value: chatCount }]} />;

const UnreadDonutChart = ({
  isDark,
  topicUnread,
  chatUnread,
}: {
  isDark: boolean;
  topicUnread: number;
  chatUnread: number;
}) => <DonutChart isDark={isDark} data={[{ name: '아젠다', value: topicUnread }, { name: '채팅', value: chatUnread }]} />;

/** Bar chart for week events - bars aligned to bottom */
function WeekBarChart({ isDark, data }: { isDark: boolean; data: WeekEventItem[] }) {
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
                className={cn('w-6 rounded-t shrink-0 transition-all', d.count > 0 ? 'bg-[#5B8DEF]' : isDark ? 'bg-slate-700' : 'bg-slate-200')}
                style={{ height: barHeight }}
              />
            </div>
            <span className={cn('text-[10px] font-medium truncate w-full text-center', isDark ? 'text-slate-500' : 'text-slate-500')}>
              {d.label}
            </span>
            {d.count > 0 && (
              <span className={cn('text-[10px] font-bold', 'text-[#5B8DEF]')}>{d.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
}: DashboardHomeProps) {
  const sortedTodayEvents = useMemo(
    () => [...todayEvents].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [todayEvents]
  );

  const cardCls = cn(
    'rounded-xl border p-3 transition-colors',
    isDark ? 'bg-slate-800/60 border-slate-600' : 'bg-white border-slate-200 shadow-sm'
  );

  const statCls = cn(
    'rounded-lg px-2.5 py-1.5 flex items-center gap-2',
    isDark ? 'bg-slate-700/80' : 'bg-slate-50'
  );

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
        {/* Col 1: Welcome + Stats + Quick actions */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className={cn(cardCls, 'py-4 shrink-0')}>
            <h1 className={cn('text-lg font-bold m-0 mb-0.5', isDark ? 'text-white' : 'text-slate-900')}>
              안녕하세요, {userName || '사용자'}님
            </h1>
            <p className={cn('text-[12px] m-0', isDark ? 'text-slate-400' : 'text-slate-500')}>
              오늘도 좋은 하루 보내세요
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className={statCls}>
              <span className={cn('text-base font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{topicCount}</span>
              <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>아젠다</span>
            </div>
            <div className={statCls}>
              <span className={cn('text-base font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>{chatCount}</span>
              <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>채팅</span>
            </div>
            <div
              className={cn(statCls, 'cursor-pointer hover:opacity-90')}
              onClick={() => setActivePanel('mention')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActivePanel('mention')}
            >
              <span className={cn('text-base font-bold', totalUnread > 0 ? 'text-[#5B8DEF]' : isDark ? 'text-slate-200' : 'text-slate-800')}>
                {totalUnread}
              </span>
              <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>읽지 않음</span>
              {unreadMentionCount > 0 && (
                <span className="ml-auto min-w-[16px] h-4 rounded-full bg-[#74A0FF] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMentionCount > 9 ? '9+' : unreadMentionCount}
                </span>
              )}
            </div>
            <div className={statCls}>
              <span className={cn('text-base font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>
                {sortedTodayEvents.length}
              </span>
              <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>오늘 일정</span>
            </div>
          </div>

        </div>

        {/* Col 2: Charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 min-h-0">
          <div className={cn(cardCls, 'flex flex-col')}>
            <h2 className={cn('text-[13px] font-bold m-0 mb-2 shrink-0', isDark ? 'text-slate-200' : 'text-slate-900')}>방 분포</h2>
            <div className="flex items-center gap-3">
              <RoomDonutChart isDark={isDark} topicCount={topicCount} chatCount={chatCount} />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5B8DEF] shrink-0" />
                  <span className={cn('text-[12px]', isDark ? 'text-slate-300' : 'text-slate-700')}>아젠다 {topicCount}개</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7CA5FF] shrink-0" />
                  <span className={cn('text-[12px]', isDark ? 'text-slate-300' : 'text-slate-700')}>채팅 {chatCount}개</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(cardCls, 'flex flex-col')}>
            <h2 className={cn('text-[13px] font-bold m-0 mb-2 shrink-0', isDark ? 'text-slate-200' : 'text-slate-900')}>읽지 않음</h2>
            <div className="flex items-center gap-3">
              <UnreadDonutChart isDark={isDark} topicUnread={topicUnreadCount} chatUnread={chatUnreadCount} />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5B8DEF] shrink-0" />
                  <span className={cn('text-[12px]', isDark ? 'text-slate-300' : 'text-slate-700')}>아젠다 {topicUnreadCount}건</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7CA5FF] shrink-0" />
                  <span className={cn('text-[12px]', isDark ? 'text-slate-300' : 'text-slate-700')}>채팅 {chatUnreadCount}건</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cn(cardCls, 'sm:col-span-2 xl:col-span-1')}>
            <h2 className={cn('text-[13px] font-bold m-0 mb-2', isDark ? 'text-slate-200' : 'text-slate-900')}>이번 주 일정</h2>
            <WeekBarChart isDark={isDark} data={weekEvents} />
          </div>
        </div>

        {/* Col 3: Today's events + CTA */}
        <div className="flex flex-col gap-3 min-h-0 md:col-span-2 xl:col-span-1">
          <div className={cn(cardCls, 'flex-1 min-h-0 flex flex-col overflow-hidden')}>
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className={cn('text-[13px] font-bold m-0', isDark ? 'text-slate-200' : 'text-slate-900')}>오늘의 일정</h2>
              <button
                type="button"
                className={cn('text-[11px] font-medium border-none bg-transparent cursor-pointer', isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}
                onClick={() => setActivePanel('schedule')}
              >
                전체 보기
              </button>
            </div>
            {sortedTodayEvents.length === 0 ? (
              <p className={cn('text-[12px] m-0 py-2', isDark ? 'text-slate-500' : 'text-slate-400')}>
                오늘 예정된 일정이 없습니다
              </p>
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5 overflow-auto min-h-0 flex-1">
                {sortedTodayEvents.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className={cn(
                      'flex items-center gap-2 py-2 px-2.5 rounded-lg shrink-0',
                      isDark ? 'bg-slate-700/50' : 'bg-slate-50'
                    )}
                  >
                    <span className={cn('w-1 h-8 rounded-full shrink-0', 'bg-[#5B8DEF]')} />
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-[12px] font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>
                        {ev.title}
                      </div>
                      <div className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-500')}>
                        {formatEventTime(ev.startAt, ev.endAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={cn(cardCls, 'text-center py-4 shrink-0', isDark ? 'bg-slate-800/40' : 'bg-slate-50/80')}>
            <p className={cn('text-[12px] m-0', isDark ? 'text-slate-400' : 'text-slate-500')}>
              왼쪽 아젠다 또는 채팅에서 대화를 시작하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardHome);
