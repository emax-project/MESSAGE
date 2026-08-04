// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '../../../api';
import DashboardHome from './DashboardHome';

afterEach(() => {
  cleanup();
});

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'ev-1',
  userId: 'user-1',
  title: '팀 회의',
  startAt: '2026-03-18T09:00:00',
  endAt: '2026-03-18T10:30:00',
  description: null,
  ...overrides,
});

const baseProps = () => ({
  isDark: false,
  userName: '홍길동' as string | null,
  topicCount: 2,
  chatCount: 3,
  totalUnread: 5,
  unreadMentionCount: 2,
  todayEvents: [] as Event[],
  weekEvents: [{ dateKey: '2026-03-17', label: '월', count: 1 }],
  setActivePanel: vi.fn(),
});

describe('DashboardHome', () => {
  it('renders welcome with user name', () => {
    render(<DashboardHome {...baseProps()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('안녕하세요, 홍길동님');
  });

  it('renders default user label when userName is missing', () => {
    const props = baseProps();
    props.userName = null;
    render(<DashboardHome {...props} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('안녕하세요, 사용자님');
  });

  it('shows empty message when there are no today events', () => {
    render(<DashboardHome {...baseProps()} />);
    expect(screen.getByText('오늘 예정된 일정이 없습니다')).toBeInTheDocument();
  });

  it('lists today events sorted by start time', () => {
    const props = baseProps();
    props.todayEvents = [
      makeEvent({ id: 'b', title: '나중', startAt: '2026-03-18T14:00:00', endAt: '2026-03-18T15:00:00' }),
      makeEvent({ id: 'a', title: '먼저', startAt: '2026-03-18T08:00:00', endAt: '2026-03-18T09:00:00' }),
    ];
    render(<DashboardHome {...props} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('먼저');
    expect(items[1]).toHaveTextContent('나중');
  });

  it('calls setActivePanel("schedule") when clicking 전체 보기', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<DashboardHome {...props} />);
    await user.click(screen.getByRole('button', { name: '전체 보기' }));
    expect(props.setActivePanel).toHaveBeenCalledWith('schedule');
  });

  it('calls onEventClick with event when a today event row is clicked', async () => {
    const user = userEvent.setup();
    const ev = makeEvent({ id: 'ev-click', title: '클릭 테스트' });
    const onEventClick = vi.fn();
    render(<DashboardHome {...baseProps()} todayEvents={[ev]} onEventClick={onEventClick} />);
    await user.click(screen.getByRole('button', { name: /클릭 테스트/ }));
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick).toHaveBeenCalledWith(ev);
  });

  it('calls setActivePanel("mention") when Space on unread stat', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<DashboardHome {...props} />);
    const unreadBtn = screen.getByRole('button', { name: /읽지 않음/ });
    unreadBtn.focus();
    await user.keyboard(' ');
    expect(props.setActivePanel).toHaveBeenCalledWith('mention');
  });

  it('shows 외 N건 더보기 when more than 5 events and opens schedule', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    props.todayEvents = Array.from({ length: 7 }, (_, i) =>
      makeEvent({
        id: `ev-${i}`,
        title: `일정 ${i}`,
        startAt: `2026-03-18T${String(9 + i).padStart(2, '0')}:00:00`,
        endAt: `2026-03-18T${String(10 + i).padStart(2, '0')}:00:00`,
      })
    );
    render(<DashboardHome {...props} />);
    expect(screen.getByRole('button', { name: '외 2건 더보기' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '외 2건 더보기' }));
    expect(props.setActivePanel).toHaveBeenCalledWith('schedule');
  });

  it('renders core stats and week chart without donut sections', () => {
    render(<DashboardHome {...baseProps()} />);
    expect(screen.getByText('아젠다')).toBeInTheDocument();
    expect(screen.getByText('채팅')).toBeInTheDocument();
    expect(screen.getByText('읽지 않음')).toBeInTheDocument();
    expect(screen.getByText('이번 주 일정')).toBeInTheDocument();
    expect(screen.queryByText('방 분포')).not.toBeInTheDocument();
    expect(screen.queryByText('상단 메뉴의 대화에서')).not.toBeInTheDocument();
  });
});
