// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '../../../api';
import SchedulePanel from './SchedulePanel';

afterEach(() => {
  cleanup();
});

const sampleEvent: Event = {
  id: 'ev-1',
  userId: 'user-1',
  title: '분기 회고',
  startAt: '2026-03-18T09:00:00',
  endAt: '2026-03-18T10:00:00',
  description: '팀 회의',
};

const baseProps = () => ({
  st: {
    panelHeader: {},
    panelTitle: {},
    panelBody: {},
    formInput: {},
    formBtn: {},
    formBtnCancel: {},
  },
  isDark: false,
  isNarrowLayout: false,
  panelWrapStyle: () => ({}),
  calendarMonth: new Date('2026-03-01T00:00:00'),
  selectedDate: '2026-03-18',
  eventsByDate: new Map<string, Event[]>([['2026-03-18', [sampleEvent]]]),
  eventForm: { title: '', startAt: '', endAt: '', description: '' },
  editingEventId: null as string | null,
  setCalendarMonth: vi.fn(),
  setSelectedDate: vi.fn(),
  setEventForm: vi.fn(),
  onUpdateEvent: vi.fn(),
  onCreateEvent: vi.fn(),
  onCancelEdit: vi.fn(),
  onEditEvent: vi.fn(),
  onDeleteEvent: vi.fn(),
});

describe('SchedulePanel', () => {
  it('calls create handler when add button clicked in create mode', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SchedulePanel {...props} />);

    await user.click(screen.getByRole('button', { name: '추가' }));
    expect(props.onCreateEvent).toHaveBeenCalledTimes(1);
  });

  it('calls update and cancel handlers in edit mode', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    props.editingEventId = sampleEvent.id;

    render(<SchedulePanel {...props} />);

    const updateButtons = screen.getAllByRole('button', { name: '수정' });
    await user.click(updateButtons[0]);
    await user.click(updateButtons[updateButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(props.onUpdateEvent).toHaveBeenCalled();
    expect(props.onCancelEdit).toHaveBeenCalledTimes(1);
  });

  it('handles calendar navigation and today shortcut', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SchedulePanel {...props} />);

    await user.click(screen.getByRole('button', { name: '이전 달' }));
    await user.click(screen.getByRole('button', { name: '다음 달' }));
    expect(props.setCalendarMonth).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: '오늘로 이동' }));
    expect(props.setSelectedDate).toHaveBeenCalled();
    expect(props.setCalendarMonth).toHaveBeenCalledTimes(3);
  });

  it('fires edit and delete handlers for listed events', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<SchedulePanel {...props} />);

    const buttons = screen.getAllByRole('button', { name: '수정' });
    const editButton = buttons[buttons.length - 1];
    const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    await user.click(editButton);
    await user.click(deleteButton);

    expect(props.onEditEvent).toHaveBeenCalledWith(sampleEvent);
    expect(props.onDeleteEvent).toHaveBeenCalledWith('ev-1');
  });
});
