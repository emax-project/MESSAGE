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
  statTodayEvents: '오늘 일정',

  unreadStatAria: (totalUnread: number, unreadMentionCount: number) =>
    `읽지 않음 ${totalUnread}건${unreadMentionCount > 0 ? `, 멘션 ${unreadMentionCount}건` : ''}. 클릭하면 읽지 않은 메시지 목록을 엽니다`,

  chartRoomDistribution: '방 분포',
  chartUnreadTitle: '읽지 않음',
  chartWeek: '이번 주 일정',

  ariaRoomDistribution: (topicCount: number, chatCount: number) =>
    `방 분포: 아젠다 ${topicCount}개, 채팅 ${chatCount}개`,
  ariaUnreadChart: (topicUnread: number, chatUnread: number) =>
    `읽지 않음: 아젠다 ${topicUnread}건, 채팅 ${chatUnread}건`,
  ariaWeekBar: (segments: string) => `이번 주 일정: ${segments}`,

  legendAgendaRooms: (n: number) => `아젠다 ${n}개`,
  legendChatRooms: (n: number) => `채팅 ${n}개`,
  legendAgendaUnread: (n: number) => `아젠다 ${n}건`,
  legendChatUnread: (n: number) => `채팅 ${n}건`,

  todayScheduleTitle: '오늘의 일정',
  viewAll: '전체 보기',
  noEventsToday: '오늘 예정된 일정이 없습니다',
  moreEvents: (extraCount: number) => `외 ${extraCount}건 더보기`,
  ctaStartChat: '상단 메뉴의 대화에서 아젠다·채팅을 시작하세요',

  eventRowAria: (title: string, timeRange: string) =>
    `${title}, ${timeRange}. 클릭하면 일정 상세를 엽니다`,
} as const;

export type DashboardKo = typeof dashboardKo;
