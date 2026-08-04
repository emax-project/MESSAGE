/**
 * 대시보드 홈 화면 문구 (ko)
 * 향후 locale 스위치 시 동일 키로 en 등 추가 가능
 */
export const dashboardKo = {
  defaultUserName: '사용자',
  welcome: (displayName: string) => `안녕하세요, ${displayName}님`,
  greetingSub: '오늘도 좋은 하루 보내세요',

  statAgenda: '아젠다',
  statChat: '채팅',
  statUnread: '읽지 않음',

  unreadStatAria: (totalUnread: number, unreadMentionCount: number) =>
    `읽지 않음 ${totalUnread}건${unreadMentionCount > 0 ? `, 멘션 ${unreadMentionCount}건` : ''}. 클릭하면 읽지 않은 메시지 목록을 엽니다`,

  chartWeek: '이번 주 일정',
  ariaWeekBar: (segments: string) => `이번 주 일정: ${segments}`,

  todayScheduleTitle: '오늘의 일정',
  viewAll: '전체 보기',
  noEventsToday: '오늘 예정된 일정이 없습니다',
  moreEvents: (extraCount: number) => `외 ${extraCount}건 더보기`,

  eventRowAria: (title: string, timeRange: string) =>
    `${title}, ${timeRange}. 클릭하면 일정 상세를 엽니다`,
} as const;

export type DashboardKo = typeof dashboardKo;
